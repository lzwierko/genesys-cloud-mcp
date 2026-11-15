import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { gcExternalContactsRegisterFunctions } from '../src/mcp-functions/external-contacts.ts';

const expectedExternalContactsTools = [
  'get-externalcontacts-contact',
  'get-externalcontacts-contact-identifiers',
  'get-externalcontacts-contact-journey-segments',
  'get-externalcontacts-contact-journey-sessions',
  'get-externalcontacts-contact-note',
  'get-externalcontacts-contact-notes',
  'get-externalcontacts-contact-unresolved',
  'get-externalcontacts-contacts',
  'get-externalcontacts-contacts-export',
  'get-externalcontacts-contacts-exports',
  'get-externalcontacts-contacts-schema',
  'get-externalcontacts-contacts-schema-version',
  'get-externalcontacts-contacts-schema-versions',
  'get-externalcontacts-contacts-schemas',
  'get-externalcontacts-contacts-schemas-coretype',
  'get-externalcontacts-contacts-schemas-coretypes',
  'get-externalcontacts-contacts-schemas-limits',
  'get-externalcontacts-externalsource',
  'get-externalcontacts-externalsources',
  'get-externalcontacts-graphs-clusterscan',
  'get-externalcontacts-graphs-clusterscan-cluster',
  'get-externalcontacts-graphs-clusterscan-clusters',
  'get-externalcontacts-graphs-clusterscan-statistics',
  'get-externalcontacts-graphs-clusterscans',
  'get-externalcontacts-graphs-clusterscans-latest',
  'get-externalcontacts-graphs-clusterscans-latest-statistics',
  'get-externalcontacts-graphs-settings',
  'get-externalcontacts-import-csv-setting',
  'get-externalcontacts-import-csv-settings',
  'get-externalcontacts-import-csv-upload-details',
  'get-externalcontacts-import-csv-upload-preview',
  'get-externalcontacts-import-job',
  'get-externalcontacts-import-jobs',
  'get-externalcontacts-import-setting',
  'get-externalcontacts-import-settings',
  'get-externalcontacts-notes-export',
  'get-externalcontacts-notes-exports',
  'get-externalcontacts-organization',
  'get-externalcontacts-organization-contacts',
  'get-externalcontacts-organization-identifiers',
  'get-externalcontacts-organization-note',
  'get-externalcontacts-organization-notes',
  'get-externalcontacts-organization-relationships',
  'get-externalcontacts-organizations',
  'get-externalcontacts-organizations-export',
  'get-externalcontacts-organizations-exports',
  'get-externalcontacts-organizations-schema',
  'get-externalcontacts-organizations-schema-version',
  'get-externalcontacts-organizations-schema-versions',
  'get-externalcontacts-organizations-schemas',
  'get-externalcontacts-organizations-schemas-coretype',
  'get-externalcontacts-organizations-schemas-coretypes',
  'get-externalcontacts-organizations-schemas-limits',
  'get-externalcontacts-relationship',
  'get-externalcontacts-relationships-export',
  'get-externalcontacts-relationships-exports',
  'get-externalcontacts-reversewhitepageslookup',
  'get-externalcontacts-scan-contacts',
  'get-externalcontacts-scan-contacts-divisionviews-all',
  'get-externalcontacts-scan-notes',
  'get-externalcontacts-scan-notes-divisionviews-all',
  'get-externalcontacts-scan-organizations',
  'get-externalcontacts-scan-organizations-divisionviews-all',
  'get-externalcontacts-scan-relationships',
  'get-externalcontacts-scan-relationships-divisionviews-all',
];

test('external contacts tools are discoverable', async (t) => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  gcExternalContactsRegisterFunctions(server);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.deepEqual(names, expectedExternalContactsTools);
});
