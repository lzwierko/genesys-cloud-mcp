import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { gcPresenceRegisterFunctions } from '../src/mcp-functions/presence.ts';

const expectedPresenceTools = [
  'get-presence-definition',
  'get-presence-definitions',
  'get-presence-settings',
  'get-presence-source',
  'get-presence-sources',
  'get-presence-user-primarysource',
  'get-presencedefinition',
  'get-presencedefinitions',
  'get-systempresences',
  'get-user-presence',
  'get-user-presences-purecloud',
  'get-users-presence-bulk',
  'get-users-presences-purecloud-bulk',
];

test('presence tools are discoverable', async (t) => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  gcPresenceRegisterFunctions(server);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.deepEqual(names, expectedPresenceTools);
});
