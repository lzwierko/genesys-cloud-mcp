import platformClient from 'purecloud-platform-client-v2';
import type { GenesysConfig } from './config.ts';
import { authenticateBrowser, BrowserAuthError, clearBrowserCredentials } from './browser-auth.ts';

let genesysClient: typeof platformClient.ApiClient.instance | null = null;
let browserConfig: GenesysConfig | undefined;
let browserTokenExpiresAt = 0;
let authenticationQueue: Promise<void> = Promise.resolve();

function serializeAuthentication<T>(operation: () => Promise<T>): Promise<T> {
  const result = authenticationQueue.then(operation);
  // Keep the queue usable after failure; callers still receive the rejected result.
  authenticationQueue = result.then(
    () => {},
    () => {},
  );
  return result;
}

export function initializeGenesysClient(
  config: GenesysConfig,
): Promise<typeof platformClient.ApiClient.instance> {
  return serializeAuthentication(() => authenticate(config));
}

async function authenticate(
  config: GenesysConfig,
): Promise<typeof platformClient.ApiClient.instance> {
  const client = platformClient.ApiClient.instance;
  client.config.logger.log_to_console = false;
  client.setPersistSettings(false);
  client.setEnvironment(config.region);
  if (config.clientSecret) {
    try {
      await client.loginClientCredentialsGrant(config.clientId, config.clientSecret);
    } catch (error) {
      if (error instanceof BrowserAuthError) throw error;
      throw new Error(
        'Genesys Cloud authentication failed. Check the region and OAuth client credentials.',
      );
    }
    browserConfig = undefined;
  } else {
    try {
      const token = await authenticateBrowser(config);
      client.setAccessToken(token.accessToken);
      browserTokenExpiresAt = token.expiresAt;
      browserConfig = config;
    } catch {
      throw new Error(
        'Genesys Cloud browser authentication failed. Check the OAuth client, callback URL, network and user credential store.',
      );
    }
  }
  genesysClient = client;
  return client;
}

export function invalidateGenesysLogin(config: GenesysConfig): Promise<void> {
  return serializeAuthentication(async () => {
    genesysClient = null;
    browserConfig = undefined;
    browserTokenExpiresAt = 0;
    platformClient.ApiClient.instance.clearAuthData();
    await clearBrowserCredentials(config);
  });
}

export async function getGenesysClient(): Promise<typeof platformClient.ApiClient.instance> {
  await authenticationQueue;
  if (!genesysClient) {
    throw new Error('Genesys client is not initialized.');
  }
  if (browserConfig && browserTokenExpiresAt <= Date.now() + 60_000) {
    await initializeGenesysClient(browserConfig);
  }
  if (!genesysClient) {
    throw new Error('Genesys client is not initialized.');
  }
  return genesysClient;
}
