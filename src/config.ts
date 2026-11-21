import platformClient from 'purecloud-platform-client-v2';

export interface GenesysConfig {
  region: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

export type ToolAccess = 'read' | 'write' | 'all';

export interface Config {
  genesys: GenesysConfig;
  toolAccess: ToolAccess;
  transport: 'stdio' | 'http';
  host: string;
  port: number;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value || /^\$\{.*\}$/.test(value)) {
    throw new Error(`Set ${name} to a non-empty value.`);
  }
  return value;
}

export function readConfig(
  env: NodeJS.ProcessEnv = process.env,
  args: string[] = process.argv.slice(2),
): Config {
  const transportArg = args.find((arg) => arg.startsWith('--transport='));
  if (args.some((arg) => arg !== transportArg)) {
    throw new Error('Usage: --transport=stdio or --transport=http');
  }
  const transport = transportArg?.slice('--transport='.length) ?? env.MCP_TRANSPORT ?? 'stdio';
  if (transport !== 'stdio' && transport !== 'http') {
    throw new Error('MCP_TRANSPORT must be stdio or http.');
  }

  const toolAccess = env.MCP_TOOL_ACCESS ?? 'all';
  if (toolAccess !== 'read' && toolAccess !== 'write' && toolAccess !== 'all') {
    throw new Error('MCP_TOOL_ACCESS must be read, write or all.');
  }

  const regionValue = required(env, 'GENESYSCLOUD_REGION');
  const region = platformClient.PureCloudRegionHosts[regionValue] ?? regionValue;
  if (!Object.values(platformClient.PureCloudRegionHosts).includes(region)) {
    throw new Error(
      'GENESYSCLOUD_REGION must be a Genesys Cloud region hostname or SDK region key.',
    );
  }

  const portValue = env.MCP_PORT ?? '3000';
  const port = Number(portValue);
  if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('MCP_PORT must be an integer between 1 and 65535.');
  }
  const host = env.MCP_HOST?.trim() ?? '127.0.0.1';
  if (!host) {
    throw new Error('MCP_HOST must not be empty.');
  }

  const clientSecret = env.GENESYSCLOUD_OAUTHCLIENT_SECRET?.trim() ?? '';
  if (/^\$\{.*\}$/.test(clientSecret)) {
    throw new Error('GENESYSCLOUD_OAUTHCLIENT_SECRET contains an unresolved placeholder.');
  }
  const redirectUri = env.GENESYSCLOUD_REDIRECT_URI?.trim() || 'http://localhost:6798/';
  if (!clientSecret) {
    let uri: URL;
    try {
      uri = new URL(redirectUri);
    } catch {
      throw new Error('GENESYSCLOUD_REDIRECT_URI must be a valid loopback HTTP URL.');
    }
    if (
      uri.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname) ||
      !uri.port ||
      Number(uri.port) === 0 ||
      uri.username ||
      uri.password ||
      uri.search ||
      uri.hash
    ) {
      throw new Error(
        'GENESYSCLOUD_REDIRECT_URI must be a loopback HTTP URL with a port and no query or fragment.',
      );
    }
  }

  return {
    genesys: {
      region,
      clientId: required(env, 'GENESYSCLOUD_OAUTHCLIENT_ID'),
      clientSecret,
      redirectUri,
    },
    toolAccess,
    transport,
    host,
    port,
  };
}
