import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GenesysConfig } from './config.ts';
import { initializeGenesysClient } from './genesys.ts';
import { gcUsersRegisterFunctions } from './mcp-functions/users.ts';
import { gcLoginRegisterFunctions } from './mcp-functions/login.ts';

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
  return server;
}
