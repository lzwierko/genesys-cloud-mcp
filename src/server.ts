import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GenesysConfig } from './config.ts';
import { initializeGenesysClient } from './genesys.ts';
import { registerFunctions } from './mcp-functions/users.ts';

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

  server.registerTool(
    'verify_login',
    {
      description: 'Verify Genesys Cloud login using the configured OAuth client credentials.',
      inputSchema: {},
    },
    async () => {
      try {
        await initializeGenesysClient(genesysConfig);
        return {
          content: [
            {
              type: 'text',
              text: 'Genesys Cloud login verified successfully.',
            },
          ],
        };
      } catch {
        const message =
          'Genesys Cloud login verification failed. Check the region and OAuth client credentials.';
        console.error(message);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );

  registerFunctions(server);
  return server;
}
