import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { gcLicenseRegisterFunctions } from '../src/mcp-functions/license.ts';

const expectedLicenseTools = [
  'get-license-definition',
  'get-license-definitions',
  'get-license-toggle',
  'get-license-user',
  'get-license-users',
];

test('license tools are discoverable', async (t) => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  gcLicenseRegisterFunctions(server);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.deepEqual(names, expectedLicenseTools);
});
