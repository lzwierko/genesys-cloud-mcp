import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { gcObjectsRegisterFunctions } from '../src/mcp-functions/objects.ts';

const expectedObjectsTools = [
  'get-authorization-division',
  'get-authorization-divisions',
  'get-authorization-divisions-deleted',
  'get-authorization-divisions-home',
  'get-authorization-divisions-limit',
  'get-authorization-divisions-query',
];

test('objects tools are discoverable', async (t) => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  gcObjectsRegisterFunctions(server);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.deepEqual(names, expectedObjectsTools);
});
