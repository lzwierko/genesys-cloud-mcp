import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import platformClient from 'purecloud-platform-client-v2';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { readConfig } from '../src/config.ts';
import { initializeGenesysClient } from '../src/genesys.ts';
import { createHttpApp } from '../src/http.ts';

const env = {
  GENESYSCLOUD_REGION: 'mypurecloud.com',
  GENESYSCLOUD_OAUTHCLIENT_ID: 'test-client',
  GENESYSCLOUD_OAUTHCLIENT_SECRET: 'test-secret',
};

test('configuration accepts env and CLI transport selection and SDK region keys', () => {
  assert.equal(readConfig(env, []).transport, 'stdio');
  const config = readConfig(
    { ...env, GENESYSCLOUD_REGION: 'eu_west_1', MCP_TRANSPORT: 'stdio', MCP_PORT: '4321' },
    ['--transport=http'],
  );
  assert.equal(config.transport, 'http');
  assert.equal(config.genesys.region, platformClient.PureCloudRegionHosts.eu_west_1);
  assert.equal(config.port, 4321);
});

test('configuration rejects missing credentials, unresolved placeholders and invalid settings', () => {
  for (const key of Object.keys(env)) {
    assert.throws(() => readConfig({ ...env, [key]: '' }, []), new RegExp(key));
    assert.throws(() => readConfig({ ...env, [key]: `\${${key}}` }, []), new RegExp(key));
  }
  assert.throws(() => readConfig({ ...env, GENESYSCLOUD_REGION: 'untrusted.example' }, []));
  assert.throws(() => readConfig(env, ['--transport=invalid']));
  for (const port of ['0', '65536', '1.5', '', 'NaN']) {
    assert.throws(() => readConfig({ ...env, MCP_PORT: port }, []), /MCP_PORT/);
  }
});

test('Genesys initialization selects region and authenticates without exposing SDK errors', async (t) => {
  const client = platformClient.ApiClient.instance;
  const region = t.mock.method(client, 'setEnvironment', () => {});
  const persist = t.mock.method(client, 'setPersistSettings', () => {});
  const login = t.mock.method(client, 'loginClientCredentialsGrant', async () => ({
    accessToken: 'test-token',
    tokenExpiryTime: Date.now() + 60_000,
    tokenExpiryTimeString: '',
  }));
  const config = readConfig(env, []).genesys;
  assert.equal(await initializeGenesysClient(config), client);
  assert.deepEqual(region.mock.calls[0]?.arguments, ['mypurecloud.com']);
  assert.deepEqual(persist.mock.calls[0]?.arguments, [false]);
  assert.deepEqual(login.mock.calls[0]?.arguments, ['test-client', 'test-secret']);
  assert.equal(client.config.logger.log_to_console, false);
  login.mock.mockImplementation(async () => {
    throw new Error('sensitive authorization data');
  });
  await assert.rejects(initializeGenesysClient(config), {
    message: 'Genesys Cloud authentication failed. Check the region and OAuth client credentials.',
  });
});

test('HTTP supports ping, verifies login, reports safe authentication errors and rejects GET', async (t) => {
  const login = t.mock.method(
    platformClient.ApiClient.instance,
    'loginClientCredentialsGrant',
    async () => ({
      accessToken: 'test-token',
      tokenExpiryTime: Date.now() + 60_000,
      tokenExpiryTimeString: '',
    }),
  );
  const listener = createHttpApp('127.0.0.1', readConfig(env, []).genesys).listen(0, '127.0.0.1');
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        listener.close((error) => (error ? reject(error) : resolve()));
        listener.closeAllConnections();
      }),
  );
  await once(listener, 'listening');
  const address = listener.address();
  assert.ok(address && typeof address !== 'string');
  const url = new URL(`http://127.0.0.1:${address.port}/mcp`);
  const client = new Client({ name: 'test', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(url));
  assert.equal(client.getServerVersion()?.name, 'genesys-cloud-mcp');
  assert.deepEqual(
    (await client.listTools()).tools.map((tool) => tool.name),
    ['ping', 'verify_login', 'get-users', 'get-user-by-id'],
  );
  const result = await client.callTool({ name: 'ping', arguments: {} });
  assert.deepEqual(result.content, [{ type: 'text', text: 'pong' }]);
  assert.notEqual(result.isError, true);
  const verified = await client.callTool({ name: 'verify_login', arguments: {} });
  assert.deepEqual(verified.content, [
    { type: 'text', text: 'Genesys Cloud login verified successfully.' },
  ]);
  assert.notEqual(verified.isError, true);
  assert.deepEqual(login.mock.calls[0]?.arguments, ['test-client', 'test-secret']);
  login.mock.mockImplementation(async () => {
    throw new Error('sensitive authorization data');
  });
  const log = t.mock.method(console, 'error', () => {});
  const failed = await client.callTool({ name: 'verify_login', arguments: {} });
  const message =
    'Genesys Cloud login verification failed. Check the region and OAuth client credentials.';
  assert.equal(failed.isError, true);
  assert.deepEqual(failed.content, [{ type: 'text', text: message }]);
  assert.deepEqual(log.mock.calls[0]?.arguments, [message]);
  const response = await fetch(url);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('stdio supports MCP initialization, ping and login verification', async (t) => {
  const client = new Client({ name: 'test', version: '1.0.0' });
  t.after(() => client.close());
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      '--input-type=module',
      '-e',
      "import platformClient from 'purecloud-platform-client-v2'; " +
        'platformClient.ApiClient.instance.loginClientCredentialsGrant = async () => ({}); ' +
        "await import('./src/index.ts');",
    ],
    env: { ...env, MCP_TRANSPORT: 'stdio' },
    cwd: process.cwd(),
    stderr: 'pipe',
  });
  await client.connect(transport);
  assert.equal(client.getServerVersion()?.name, 'genesys-cloud-mcp');
  assert.deepEqual(
    (await client.listTools()).tools.map((tool) => tool.name),
    ['ping', 'verify_login', 'get-users', 'get-user-by-id'],
  );
  const result = await client.callTool({ name: 'ping' });
  assert.deepEqual(result.content, [{ type: 'text', text: 'pong' }]);
  assert.notEqual(result.isError, true);
  const verified = await client.callTool({ name: 'verify_login' });
  assert.deepEqual(verified.content, [
    { type: 'text', text: 'Genesys Cloud login verified successfully.' },
  ]);
  assert.notEqual(verified.isError, true);
});
