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

const expectedTools = [
  'ping',
  'verify_login',
  'invalidate_login',
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
  'get-authorization-division',
  'get-authorization-divisions',
  'get-authorization-divisions-deleted',
  'get-authorization-divisions-home',
  'get-authorization-divisions-limit',
  'get-authorization-divisions-query',
  'get-license-definition',
  'get-license-definitions',
  'get-license-toggle',
  'get-license-user',
  'get-license-users',
  'get-groups',
  'get-group',
  'get-group-dynamicsettings',
  'get-group-individuals',
  'get-group-members',
  'get-group-profile',
  'get-groups-search',
  'get-group-fieldconfig',
  'get-profiles-groups',
];

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
  for (const key of ['GENESYSCLOUD_REGION', 'GENESYSCLOUD_OAUTHCLIENT_ID']) {
    assert.throws(() => readConfig({ ...env, [key]: '' }, []), new RegExp(key));
    assert.throws(() => readConfig({ ...env, [key]: `\${${key}}` }, []), new RegExp(key));
  }
  assert.throws(() => readConfig({ ...env, GENESYSCLOUD_OAUTHCLIENT_SECRET: '${SECRET}' }, []));
  assert.equal(
    readConfig({ ...env, GENESYSCLOUD_OAUTHCLIENT_SECRET: '' }, []).genesys.clientSecret,
    '',
  );
  assert.equal(
    readConfig({ ...env, GENESYSCLOUD_OAUTHCLIENT_SECRET: undefined }, []).genesys.clientSecret,
    '',
  );
  for (const redirect of [
    'https://localhost:6798/',
    'http://example.com:6798/',
    'http://localhost:0/',
    'http://localhost:6798/?x=1',
    'http://localhost/',
  ]) {
    assert.throws(
      () =>
        readConfig(
          { ...env, GENESYSCLOUD_OAUTHCLIENT_SECRET: '', GENESYSCLOUD_REDIRECT_URI: redirect },
          [],
        ),
      /GENESYSCLOUD_REDIRECT_URI/,
    );
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
    expectedTools,
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
    'Genesys Cloud login verification failed. Check the server logs and authentication configuration.';
  assert.equal(failed.isError, true);
  assert.deepEqual(failed.content, [{ type: 'text', text: message }]);
  assert.deepEqual(log.mock.calls[0]?.arguments, [
    'Genesys Cloud authentication failed. Check the region and OAuth client credentials.',
  ]);
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
    expectedTools,
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
