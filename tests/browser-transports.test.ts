import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { AsyncEntry } from '@napi-rs/keyring';
import platformClient from 'purecloud-platform-client-v2';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpApp } from '../src/http.ts';
import { getGenesysClient, initializeGenesysClient } from '../src/genesys.ts';

const config = {
  region: 'mypurecloud.com',
  clientId: 'test-client',
  clientSecret: '',
  redirectUri: 'http://localhost:6798/',
};
const cached = JSON.stringify({
  accessToken: 'test-token',
  refreshToken: 'test-refresh',
  expiresAt: Date.now() + 3_600_000,
});

test('HTTP starts and verifies login using a cached browser token', async (t) => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  let stored = cached;
  t.mock.method(AsyncEntry.prototype, 'getPassword', async () => stored);
  t.mock.method(AsyncEntry.prototype, 'setPassword', async (value) => {
    stored = value;
  });
  const deleted = t.mock.method(AsyncEntry.prototype, 'deleteCredential', async () => true);
  const cleared = t.mock.method(platformClient.ApiClient.instance, 'clearAuthData');
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', async (input, init) => {
    if (String(input) === 'https://api.mypurecloud.com/api/v2/users/me') {
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-token');
      return new Response('{}', { status: 200 });
    }
    if (String(input) === 'https://login.mypurecloud.com/oauth/token') {
      assert.equal(new URLSearchParams(String(init?.body)).get('refresh_token'), 'test-refresh');
      return new Response(JSON.stringify({ access_token: 'refreshed-token', expires_in: 3600 }), {
        status: 200,
      });
    }
    return realFetch(input, init);
  });
  await initializeGenesysClient(config);
  const listener = createHttpApp('127.0.0.1', config).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        listener.close((error) => (error ? reject(error) : resolve()));
        listener.closeAllConnections();
      }),
  );
  await once(listener, 'listening');
  const address = listener.address();
  assert.ok(address && typeof address !== 'string');
  const client = new Client({ name: 'test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`)),
  );
  const result = await client.callTool({ name: 'verify_login' });
  assert.notEqual(result.isError, true);
  assert.deepEqual(result.content, [
    { type: 'text', text: 'Genesys Cloud login verified successfully.' },
  ]);
  now += 3_600_000;
  await getGenesysClient();
  assert.equal(JSON.parse(stored).accessToken, 'refreshed-token');
  assert.ok((await client.listTools()).tools.some((tool) => tool.name === 'invalidate_login'));
  const invalidated = await client.callTool({ name: 'invalidate_login', arguments: {} });
  assert.notEqual(invalidated.isError, true);
  assert.deepEqual(invalidated.content, [
    { type: 'text', text: 'Genesys Cloud login invalidated and stored credentials cleared.' },
  ]);
  assert.equal(deleted.mock.callCount(), 1);
  assert.equal(cleared.mock.callCount(), 1);
  await assert.rejects(getGenesysClient(), /not initialized/);

  deleted.mock.mockImplementation(async () => {
    throw new Error('sensitive store details');
  });
  const log = t.mock.method(console, 'error', () => {});
  const failure = await client.callTool({ name: 'invalidate_login' });
  assert.equal(failure.isError, true);
  assert.ok(!JSON.stringify(failure).includes('sensitive store details'));
  assert.equal(log.mock.callCount(), 1);
  await assert.rejects(getGenesysClient(), /not initialized/);
});

test('stdio starts and verifies login using a cached browser token', async (t) => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  t.after(() => client.close());
  const script =
    "import { AsyncEntry } from '@napi-rs/keyring'; " +
    `AsyncEntry.prototype.getPassword = async () => ${JSON.stringify(cached)}; ` +
    'AsyncEntry.prototype.deleteCredential = async () => false; ' +
    "globalThis.fetch = async () => new Response('{}', { status: 200 }); " +
    "await import('./src/index.ts');";
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ['--input-type=module', '-e', script],
      env: {
        GENESYSCLOUD_REGION: config.region,
        GENESYSCLOUD_OAUTHCLIENT_ID: config.clientId,
        GENESYSCLOUD_OAUTHCLIENT_SECRET: '',
        MCP_TRANSPORT: 'stdio',
      },
      cwd: process.cwd(),
      stderr: 'pipe',
    }),
  );
  const result = await client.callTool({ name: 'verify_login' });
  assert.notEqual(result.isError, true);
  assert.deepEqual(result.content, [
    { type: 'text', text: 'Genesys Cloud login verified successfully.' },
  ]);
  const invalidated = await client.callTool({ name: 'invalidate_login' });
  assert.notEqual(invalidated.isError, true);
  const ping = await client.callTool({ name: 'ping' });
  assert.deepEqual(ping.content, [{ type: 'text', text: 'pong' }]);
  const users = await client.callTool({ name: 'get-users', arguments: {} });
  assert.equal(users.isError, true);
  const repeated = await client.callTool({ name: 'invalidate_login' });
  assert.notEqual(repeated.isError, true);
});
