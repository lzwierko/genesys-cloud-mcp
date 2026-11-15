import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { gcOrganizationRegisterFunctions } from '../src/mcp-functions/organization.ts';

const expectedOrganizationTools = [
  'get-organization-fieldconfig',
  'get-organizations-authentication-settings',
  'get-organizations-embeddedintegration',
  'get-organizations-ipaddressauthentication',
  'get-organizations-limits-changerequest',
  'get-organizations-limits-changerequests',
  'get-organizations-limits-docs',
  'get-organizations-limits-docs-freetrial',
  'get-organizations-limits-namespace',
  'get-organizations-limits-namespace-defaults',
  'get-organizations-limits-namespaces',
  'get-organizations-me',
  'get-organizations-whitelist',
];

test('organization tools are discoverable', async (t) => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  gcOrganizationRegisterFunctions(server);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.deepEqual(names, expectedOrganizationTools);
});
