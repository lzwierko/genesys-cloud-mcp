import platformClient from 'purecloud-platform-client-v2';
import type { GenesysConfig } from './config.ts';

let genesysClient: typeof platformClient.ApiClient.instance | null = null;

export async function initializeGenesysClient(
  config: GenesysConfig,
): Promise<typeof platformClient.ApiClient.instance> {
  const client = platformClient.ApiClient.instance;
  client.config.logger.log_to_console = true;
  client.setPersistSettings(false);
  client.setEnvironment(config.region);
  try {
    await client.loginClientCredentialsGrant(config.clientId, config.clientSecret);
  } catch (err) {
    // SDK errors may contain authorization headers or credentials.
    console.error('Genesys Cloud authentication error:', err);
    throw new Error(
      'Genesys Cloud authentication failed. Check the region and OAuth client credentials.',
    );
  }
  genesysClient = client;
  return client;
}

export async function getGenesysClient(): Promise<typeof platformClient.ApiClient.instance> {
  if (!genesysClient) {
    throw new Error('Genesys client is not initialized.');
  }
  return genesysClient;
}
