import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readConfig } from './config.ts';
import { initializeGenesysClient } from './genesys.ts';
import { createHttpApp } from './http.ts';
import { createServer } from './server.ts';

async function main(): Promise<void> {
  const config = readConfig();
  await initializeGenesysClient(config.genesys);

  if (config.transport === 'stdio') {
    const server = createServer(config.genesys);
    await server.connect(new StdioServerTransport());
    return;
  }

  const app = createHttpApp(config.host, config.genesys);
  const listener = app.listen(config.port, config.host);
  listener.on('listening', () => {
    console.error(`MCP HTTP server listening at http://${config.host}:${config.port}/mcp`);
  });
  listener.on('error', (error) => {
    console.error('MCP HTTP server failed:', error.message);
    process.exitCode = 1;
  });

  const shutdown = () => {
    listener.close((error) => {
      if (error) {
        console.error('MCP HTTP shutdown failed:', error.message);
        process.exitCode = 1;
      }
    });
    listener.closeIdleConnections();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'MCP server startup failed.');
  process.exitCode = 1;
});
