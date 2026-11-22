import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { AsyncEntry } from '@napi-rs/keyring';
import {
  authenticateBrowser,
  clearBrowserCredentials,
  requestAuthorizationCode,
} from '../src/browser-auth.ts';
import type { BrowserAuthDependencies } from '../src/browser-auth.ts';

const config = {
  region: 'mypurecloud.com',
  clientId: 'test-client',
  clientSecret: '',
  persistTokens: true,
  redirectUri: 'http://localhost:6798/',
};
const now = 1_000_000;

function setup(saved: object | null = null) {
  let value = saved ? JSON.stringify(saved) : null;
  const requests: { url: string; init?: RequestInit }[] = [];
  let authorizations = 0;
  let fetchResponse = new Response(
    JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 }),
    { status: 200 },
  );
  const deps: BrowserAuthDependencies = {
    store: {
      async getPassword() {
        return value;
      },
      async setPassword(next) {
        value = next;
      },
    },
    fetch: async (url, init) => {
      requests.push({ url: String(url), ...(init ? { init } : {}) });
      return fetchResponse.clone();
    },
    authorize: async () => {
      authorizations++;
      return 'authorization-code';
    },
    now: () => now,
  };
  return {
    deps,
    requests,
    saved: () => (value === null ? null : JSON.parse(value)),
    authorizations: () => authorizations,
    respond: (response: Response) => {
      fetchResponse = response;
    },
  };
}

test('browser authentication exchanges a PKCE code and stores the token', async () => {
  const mock = setup();
  const token = await authenticateBrowser(config, mock.deps);
  assert.deepEqual(token, {
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
    expiresAt: now + 3_600_000,
  });
  assert.deepEqual(mock.saved(), token);
  const request = mock.requests[0];
  assert.equal(request?.url, 'https://login.mypurecloud.com/oauth/token');
  const body = request?.init?.body;
  assert.ok(body instanceof URLSearchParams);
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(body.get('code'), 'authorization-code');
  assert.equal(body.get('client_id'), config.clientId);
  assert.equal(body.get('redirect_uri'), config.redirectUri);
  assert.ok(body.get('code_verifier'));
  assert.equal(mock.authorizations(), 1);
});

test('browser tokens can remain in memory without persistent credential storage', async (t) => {
  const noPersistenceConfig = {
    ...config,
    clientId: 'memory-only-client',
    persistTokens: false,
  };
  const mock = setup();
  const getPassword = t.mock.method(AsyncEntry.prototype, 'getPassword');
  const setPassword = t.mock.method(AsyncEntry.prototype, 'setPassword');
  const deleteCredential = t.mock.method(
    AsyncEntry.prototype,
    'deleteCredential',
    async () => true,
  );
  const dependencies: BrowserAuthDependencies = {
    fetch: mock.deps.fetch,
    authorize: mock.deps.authorize,
    now: mock.deps.now,
  };

  await clearBrowserCredentials(noPersistenceConfig);
  const first = await authenticateBrowser(noPersistenceConfig, dependencies);
  const second = await authenticateBrowser(noPersistenceConfig, dependencies);

  assert.deepEqual(second, first);
  assert.equal(mock.authorizations(), 1);
  assert.equal(getPassword.mock.callCount(), 0);
  assert.equal(setPassword.mock.callCount(), 0);
  assert.equal(deleteCredential.mock.callCount(), 1);

  await clearBrowserCredentials(noPersistenceConfig);
  await authenticateBrowser(noPersistenceConfig, dependencies);
  assert.equal(mock.authorizations(), 2);
  assert.equal(deleteCredential.mock.callCount(), 2);
});

test('cached tokens are validated and reused, expired tokens are refreshed', async () => {
  const cache = {
    accessToken: 'saved-access',
    refreshToken: 'saved-refresh',
    expiresAt: now + 120_000,
  };
  const mock = setup(cache);
  mock.respond(new Response('{}', { status: 200 }));
  assert.deepEqual(await authenticateBrowser(config, mock.deps), cache);
  assert.equal(mock.requests[0]?.url, 'https://api.mypurecloud.com/api/v2/users/me');
  assert.equal(mock.authorizations(), 0);

  const expired = setup({ ...cache, expiresAt: now });
  expired.respond(
    new Response(JSON.stringify({ access_token: 'refreshed', expires_in: 300 }), { status: 200 }),
  );
  const token = await authenticateBrowser(config, expired.deps);
  assert.deepEqual(token, {
    accessToken: 'refreshed',
    refreshToken: 'saved-refresh',
    expiresAt: now + 300_000,
  });
  assert.deepEqual(expired.saved(), token);
  const body = expired.requests[0]?.init?.body;
  assert.ok(body instanceof URLSearchParams);
  assert.equal(body.get('grant_type'), 'refresh_token');
  assert.equal(body.get('refresh_token'), 'saved-refresh');
  assert.equal(expired.authorizations(), 0);
});

test('invalid saved token is refreshed; network or storage failures are not treated as success', async () => {
  const cache = { accessToken: 'saved', refreshToken: 'refresh', expiresAt: now + 120_000 };
  const mock = setup(cache);
  let calls = 0;
  mock.deps.fetch = async () => {
    calls++;
    return calls === 1
      ? new Response('', { status: 401 })
      : new Response(JSON.stringify({ access_token: 'new', expires_in: 300 }), { status: 200 });
  };
  assert.equal((await authenticateBrowser(config, mock.deps)).accessToken, 'new');
  assert.equal(calls, 2);

  const unavailable = setup(cache);
  unavailable.respond(new Response('', { status: 503 }));
  await assert.rejects(authenticateBrowser(config, unavailable.deps), /validation failed/);
  assert.equal(unavailable.authorizations(), 0);
  const brokenStore = setup();
  brokenStore.deps.store.setPassword = async () => {
    throw new Error('store unavailable');
  };
  await assert.rejects(authenticateBrowser(config, brokenStore.deps), /store unavailable/);
});

test('rejected refresh requires a new browser login', async () => {
  const mock = setup({ accessToken: 'old', refreshToken: 'old-refresh', expiresAt: now });
  let calls = 0;
  mock.deps.fetch = async () => {
    calls++;
    return calls === 1
      ? new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
      : new Response(JSON.stringify({ access_token: 'new', expires_in: 300 }), { status: 200 });
  };
  assert.equal((await authenticateBrowser(config, mock.deps)).accessToken, 'new');
  assert.equal(mock.authorizations(), 1);
  assert.equal(mock.saved().refreshToken, undefined);
});

test('loopback login validates state and uses a matching PKCE challenge', async () => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  const redirectUri = `http://127.0.0.1:${address.port}/callback`;
  const verifier = 'test-verifier';
  const code = await requestAuthorizationCode({ ...config, redirectUri }, verifier, async (url) => {
    const authorize = new URL(url);
    assert.equal(authorize.searchParams.get('redirect_uri'), redirectUri);
    assert.equal(
      authorize.searchParams.get('code_challenge'),
      createHash('sha256').update(verifier).digest('base64url'),
    );
    const bad = await fetch(`${redirectUri}?state=wrong&code=bad`);
    assert.equal(bad.status, 400);
    const valid = new URL(redirectUri);
    valid.searchParams.set('state', authorize.searchParams.get('state')!);
    valid.searchParams.set('code', 'correct-code');
    const response = await fetch(valid);
    assert.equal(response.status, 200);
  });
  assert.equal(code, 'correct-code');
});
