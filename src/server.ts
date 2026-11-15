import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GenesysConfig } from './config.ts';
import { initializeGenesysClient } from './genesys.ts';
import { gcUsersRegisterFunctions } from './mcp-functions/users.ts';
import { gcLoginRegisterFunctions } from './mcp-functions/login.ts';
import { gcPresenceRegisterFunctions } from './mcp-functions/presence.ts';
import { gcOrganizationRegisterFunctions } from './mcp-functions/organization.ts';
import { gcObjectsRegisterFunctions } from './mcp-functions/objects.ts';
import { gcLicenseRegisterFunctions } from './mcp-functions/license.ts';
import { gcGroupsRegisterFunctions } from './mcp-functions/groups.ts';
import { gcExternalContactsRegisterFunctions } from './mcp-functions/external-contacts.ts';

export function createServer(genesysConfig: GenesysConfig): McpServer {
  const server = new McpServer(
    { name: 'genesys-cloud-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    'ping',
    {
      description: 'Check MCP server connectivity. Returns pong without calling Genesys Cloud.',
      inputSchema: {},
    },
    async () => ({
      content: [{ type: 'text', text: 'pong' }],
    }),
  );

  gcLoginRegisterFunctions(server, genesysConfig);
  gcUsersRegisterFunctions(server);
  gcPresenceRegisterFunctions(server);
  gcOrganizationRegisterFunctions(server);
  gcObjectsRegisterFunctions(server);
  gcLicenseRegisterFunctions(server);
  gcGroupsRegisterFunctions(server);
  gcExternalContactsRegisterFunctions(server);
  return server;
}
