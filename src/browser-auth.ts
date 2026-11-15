import { createHash, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { AsyncEntry } from '@napi-rs/keyring';
import { z } from 'zod';
import type { GenesysConfig } from './config.ts';

const tokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1).optional(),
  expiresAt: z.number().finite(),
});
type Token = z.infer<typeof tokenSchema>;

export class BrowserAuthError extends Error {}

const responseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().positive().finite(),
});

interface TokenStore {
  getPassword(): Promise<string | null>;
  setPassword(value: string): Promise<void>;
}

export interface BrowserAuthDependencies {
  store: TokenStore;
  fetch: typeof fetch;
  authorize: (config: GenesysConfig, verifier: string) => Promise<string>;
  now: () => number;
}

function credentialStore(config: GenesysConfig): AsyncEntry {
  const account = createHash('sha256')
    .update(JSON.stringify([config.region, config.clientId]))
    .digest('hex');
  return new AsyncEntry('genesys-cloud-mcp', account, {
    linux: { store: 'secret-service' },
  });
}

export async function clearBrowserCredentials(config: GenesysConfig): Promise<void> {
  try {
    await credentialStore(config).deleteCredential();
  } catch {
    throw new BrowserAuthError(
      'Could not clear saved Genesys Cloud credentials from the user credential store.',
    );
  }
}

async function openBrowser(url: string): Promise<void> {
  const [command, args] =
    process.platform === 'win32'
      ? ['rundll32.exe', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', () =>
      reject(new BrowserAuthError('Could not open the browser for Genesys login.')),
    );
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new BrowserAuthError('Could not open the browser for Genesys login.'));
    });
  });
}

export async function requestAuthorizationCode(
  config: GenesysConfig,
  verifier: string,
  launch: (url: string) => Promise<void> = openBrowser,
): Promise<string> {
  const redirect = new URL(config.redirectUri ?? 'http://localhost:6798/');
  const state = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const authorizeUrl = new URL(`https://login.${config.region}/oauth/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirect.href,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  }).toString();

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, code?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      listener.close();
      if (error) reject(error);
      else if (code) resolve(code);
      else reject(new BrowserAuthError('Genesys Cloud did not return an authorization code.'));
    };
    const listener = createServer((request, response) => {
      const callback = new URL(request.url ?? '/', redirect.origin);
      response.setHeader('Content-Type', 'text/plain; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
      if (request.method !== 'GET' || callback.pathname !== redirect.pathname) {
        response.writeHead(404).end('Not found.');
        return;
      }
      if (callback.searchParams.get('state') !== state) {
        response.writeHead(400).end('Invalid login state.');
        return;
      }
      const code = callback.searchParams.get('code');
      if (callback.searchParams.has('error') || !code) {
        response.writeHead(400).end('Genesys Cloud login failed.');
        finish(
          new BrowserAuthError('Genesys Cloud authorization was denied or did not return a code.'),
        );
        return;
      }
      response.writeHead(200).end('Login complete. You can close this tab.');
      finish(undefined, code);
    });
    const timer = setTimeout(
      () => finish(new BrowserAuthError('Genesys Cloud browser login timed out.')),
      180_000,
    );
    listener.once('error', () =>
      finish(
        new BrowserAuthError(
          'Could not start the Genesys Cloud login callback listener. Check the callback port.',
        ),
      ),
    );
    listener.listen(Number(redirect.port), redirect.hostname.replace(/^\[|\]$/g, ''), () => {
      console.error('Complete Genesys Cloud sign-in in your browser.');
      void launch(authorizeUrl.href).catch(() =>
        finish(new BrowserAuthError('Could not open the browser for Genesys login.')),
      );
    });
  });
}

async function tokenRequest(
  config: GenesysConfig,
  params: URLSearchParams,
  deps: BrowserAuthDependencies,
): Promise<Token | null> {
  const response = await deps.fetch(`https://login.${config.region}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    if (params.get('grant_type') === 'refresh_token' && response.status === 400) {
      const oauthError: unknown = await response.json().catch(() => undefined);
      if (z.object({ error: z.literal('invalid_grant') }).safeParse(oauthError).success) {
        return null;
      }
    }
    throw new BrowserAuthError(`Genesys Cloud token request failed (HTTP ${response.status}).`);
  }
  const result = responseSchema.safeParse(await response.json());
  if (!result.success)
    throw new BrowserAuthError('Genesys Cloud returned an invalid token response.');
  const refreshToken = result.data.refresh_token ?? params.get('refresh_token') ?? undefined;
  return {
    accessToken: result.data.access_token,
    expiresAt: deps.now() + result.data.expires_in * 1000,
    ...(refreshToken ? { refreshToken } : {}),
  };
}

export async function authenticateBrowser(
  config: GenesysConfig,
  dependencies?: BrowserAuthDependencies,
): Promise<Token> {
  const deps = dependencies ?? {
    store: credentialStore(config),
    fetch,
    authorize: requestAuthorizationCode,
    now: Date.now,
  };
  const saved = await deps.store.getPassword();
  let token: Token | undefined;
  if (saved !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(saved);
    } catch {
      throw new BrowserAuthError(
        'Saved Genesys Cloud credentials are invalid. Remove the saved credential and sign in again.',
      );
    }
    const result = tokenSchema.safeParse(parsed);
    if (!result.success)
      throw new BrowserAuthError(
        'Saved Genesys Cloud credentials are invalid. Remove the saved credential and sign in again.',
      );
    token = result.data;
  }
  if (token && token.expiresAt > deps.now() + 60_000) {
    const response = await deps.fetch(`https://api.${config.region}/api/v2/users/me`, {
      headers: { Authorization: `Bearer ${token.accessToken}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return token;
    if (response.status !== 401) {
      throw new BrowserAuthError(
        `Genesys Cloud token validation failed (HTTP ${response.status}).`,
      );
    }
  }
  if (token?.refreshToken) {
    const refreshed = await tokenRequest(
      config,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: config.clientId,
        refresh_token: token.refreshToken,
      }),
      deps,
    );
    if (refreshed) {
      await deps.store.setPassword(JSON.stringify(refreshed));
      return refreshed;
    }
    console.error('Saved Genesys Cloud session expired; browser sign-in is required.');
  }

  const verifier = randomBytes(32).toString('base64url');
  const code = await deps.authorize(config, verifier);
  const newToken = await tokenRequest(
    config,
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      code_verifier: verifier,
      redirect_uri: new URL(config.redirectUri ?? 'http://localhost:6798/').href,
    }),
    deps,
  );
  if (!newToken) throw new BrowserAuthError('Genesys Cloud did not return an access token.');
  await deps.store.setPassword(JSON.stringify(newToken));
  return newToken;
}
