import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { GenesysConfig } from '../config.ts';
import { initializeGenesysClient, invalidateGenesysLogin } from '../genesys.ts';

function registerFunctions(server: McpServer, genesysConfig: GenesysConfig) {
  server.registerTool(
    'verify_login',
    {
      description: 'Verify Genesys Cloud login using the configured authentication method.',
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
      } catch (error) {
        console.error(
          error instanceof Error ? error.message : 'Genesys Cloud authentication failed.',
        );
        const message =
          'Genesys Cloud login verification failed. Check the server logs and authentication configuration.';
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );

  server.registerTool(
    'invalidate_login',
    {
      description:
        'Clear the local Genesys Cloud login and saved tokens for the configured region and OAuth client. Does not revoke remote tokens or sign out the browser.',
      inputSchema: {},
      annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
      try {
        await invalidateGenesysLogin(genesysConfig);
        return {
          content: [
            {
              type: 'text',
              text: 'Genesys Cloud login invalidated and stored credentials cleared.',
            },
          ],
        };
      } catch {
        const message =
          'Genesys Cloud login was cleared locally, but saved credentials could not be removed. Check the user credential store.';
        console.error(message);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );
}

export { registerFunctions as gcLoginRegisterFunctions };
