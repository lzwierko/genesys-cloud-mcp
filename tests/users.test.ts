import assert from 'node:assert/strict';
import { test } from 'node:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { gcUsersRegisterFunctions } from '../src/mcp-functions/users.ts';

const expectedUserTools = [
  'get-users',
  'get-user-by-id',
  'get-user-me',
  'get-user-state',
  'get-analytics-users-aggregates-job',
  'get-analytics-users-aggregates-job-results',
  'get-analytics-users-details-job',
  'get-analytics-users-details-job-results',
  'get-analytics-users-details-jobs-availability',
  'get-authorization-divisionspermitted-me',
  'get-authorization-divisionspermitted-paged-me',
  'get-authorization-divisionspermitted-paged-subject-id',
  'get-authorization-subject',
  'get-authorization-subjects-me',
  'get-fieldconfig',
  'get-profiles-users',
  'get-routing-directroutingbackup-settings-me',
  'get-routing-user-directroutingbackup-settings',
  'get-routing-user-utilization',
  'get-user-adjacents',
  'get-user-callforwarding',
  'get-user-customattribute',
  'get-user-customattributes-bulk',
  'get-user-directreports',
  'get-user-externalid',
  'get-user-externalid-authority-name',
  'get-user-favorites',
  'get-user-geolocation',
  'get-user-outofoffice',
  'get-user-profile',
  'get-user-profileskills',
  'get-user-queues',
  'get-user-roles',
  'get-user-routinglanguages',
  'get-user-routingskills',
  'get-user-routingstatus',
  'get-user-skillgroups',
  'get-user-station',
  'get-user-superiors',
  'get-user-trustors',
  'get-user-verifiers',
  'get-users-chats-me',
  'get-users-customattributes-schema',
  'get-users-customattributes-schema-version',
  'get-users-customattributes-schema-versions',
  'get-users-customattributes-schemas',
  'get-users-customattributes-schemas-coretype',
  'get-users-customattributes-schemas-coretypes',
  'get-users-customattributes-schemas-limits',
  'get-users-development-activities',
  'get-users-development-activities-me',
  'get-users-development-activity',
  'get-users-externalid-authority-name-external-key',
  'get-users-me-verifiers',
  'get-users-query',
  'get-users-search',
  'get-users-stations-me',
];

test('user tools are discoverable', async (t) => {
  const server = new McpServer({ name: 'test', version: '1.0.0' });
  gcUsersRegisterFunctions(server);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const names = (await client.listTools()).tools.map((tool) => tool.name);
  assert.deepEqual(names, expectedUserTools);
});
