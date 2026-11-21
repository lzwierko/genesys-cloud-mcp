import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.ts';
import type { GenesysConfig, ToolAccess } from './config.ts';

export function createHttpApp(
  host: string,
  genesysConfig: GenesysConfig,
  toolAccess: ToolAccess = 'all',
) {
  const app = createMcpExpressApp({ host });

  app.post('/mcp', async (req, res) => {
    const server = createServer(genesysConfig, toolAccess);
    const transport = new StreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    res.on('close', () => {
      void server.close().catch((error: unknown) => {
        console.error('Failed to close MCP request:', error);
      });
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Failed to handle MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      } else {
        res.end();
      }
    }
  });

  app.all('/mcp', (_req, res) => {
    res.setHeader('Allow', 'POST');
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed' },
      id: null,
    });
  });

  return app;
}
