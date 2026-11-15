import assert from 'node:assert/strict';
import { test } from 'node:test';
import platformClient from 'purecloud-platform-client-v2';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { initializeGenesysClient } from '../src/genesys.ts';
import { createServer } from '../src/server.ts';

test('get-users returns structured JSON and reports API failures as errors', async (t) => {
  const config = {
    region: 'mypurecloud.com',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };
  t.mock.method(platformClient.ApiClient.instance, 'loginClientCredentialsGrant', async () => ({
    accessToken: 'test-token',
    tokenExpiryTime: Date.now() + 60_000,
    tokenExpiryTimeString: '',
  }));
  await initializeGenesysClient(config);
  const firstPage = Array.from({ length: 100 }, (_, id) => ({ id: `user-${id}` }));
  const lastPage = [{ id: 'user-100' }];
  const getUsers = t.mock.method(platformClient.UsersApi.prototype, 'getUsers', async (params) => ({
    entities: params?.pageNumber === 1 ? firstPage : lastPage,
  }));
  const server = createServer(config);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  assert.ok((await client.listTools()).tools.some((tool) => tool.name === 'get-users'));
  const result = await client.callTool({ name: 'get-users', arguments: {} });
  assert.deepEqual(result.structuredContent, { entities: [...firstPage, ...lastPage] });
  assert.deepEqual(result.content, []);
  assert.notEqual(result.isError, true);
  assert.deepEqual(getUsers.mock.calls[0]?.arguments, [
    { expand: [], pageSize: 100, pageNumber: 1 },
  ]);
  assert.deepEqual(getUsers.mock.calls[1]?.arguments, [
    { expand: [], pageSize: 100, pageNumber: 2 },
  ]);

  getUsers.mock.mockImplementation(async () => {
    throw new Error('sensitive API details');
  });

  const log = t.mock.method(console, 'error', () => {});
  const failed = await client.callTool({ name: 'get-users', arguments: {} });
  assert.equal(failed.isError, true);
  assert.equal(failed.structuredContent, undefined);
  assert.deepEqual(failed.content, [
    { type: 'text', text: 'Failed to retrieve Genesys Cloud users.' },
  ]);
  assert.deepEqual(log.mock.calls[0]?.arguments, ['Failed to retrieve Genesys Cloud users.']);
});

test('get-user-by-id is discoverable and retrieves the requested user', async (t) => {
  const config = {
    region: 'mypurecloud.com',
    clientId: 'test-client',
    clientSecret: 'test-secret',
  };
  t.mock.method(platformClient.ApiClient.instance, 'loginClientCredentialsGrant', async () => ({
    accessToken: 'test-token',
    tokenExpiryTime: Date.now() + 60_000,
    tokenExpiryTimeString: '',
  }));
  await initializeGenesysClient(config);
  const userId = 'c3ad1d9a-6882-45ae-ae9a-4cb0b993e8b3';
  const user = { id: userId, name: 'Example User' };
  const getUser = t.mock.method(platformClient.UsersApi.prototype, 'getUser', async () => user);
  const server = createServer(config);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const tool = (await client.listTools()).tools.find((item) => item.name === 'get-user-by-id');
  assert.ok(tool);
  assert.ok(tool.inputSchema.required?.includes('userId'));
  const result = await client.callTool({
    name: 'get-user-by-id',
    arguments: { userId, expand: ['presence'] },
  });
  assert.notEqual(result.isError, true);
  assert.deepEqual(result.structuredContent, { entity: user });
  assert.deepEqual(getUser.mock.calls[0]?.arguments, [userId, { expand: ['presence'] }]);
  const invalid = await client.callTool({
    name: 'get-user-by-id',
    arguments: { userId: 'not-a-uuid' },
  });
  assert.equal(invalid.isError, true);
  assert.equal(getUser.mock.callCount(), 1);
});
