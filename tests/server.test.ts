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
  'get-analytics-conversation-details',
  'get-analytics-conversations-aggregates-job',
  'get-analytics-conversations-aggregates-job-results',
  'get-analytics-conversations-details',
  'get-analytics-conversations-details-job',
  'get-analytics-conversations-details-job-results',
  'get-analytics-conversations-details-jobs-availability',
  'get-conversation',
  'get-conversation-accessattributes',
  'get-conversation-assistant-copilotcontext',
  'get-conversation-communication-agentchecklist',
  'get-conversation-communication-agentchecklist-job',
  'get-conversation-communication-agentchecklists',
  'get-conversation-communication-internalmessage',
  'get-conversation-communication-internalmessages',
  'get-conversation-customattribute',
  'get-conversation-customattributes',
  'get-conversation-participant-secureivrsession',
  'get-conversation-participant-secureivrsessions',
  'get-conversation-participant-wrapup',
  'get-conversation-participant-wrapupcodes',
  'get-conversation-secureattributes',
  'get-conversation-suggestion',
  'get-conversation-suggestions',
  'get-conversation-summaries',
  'get-conversations',
  'get-conversations-call',
  'get-conversations-call-participant-communication-wrapup',
  'get-conversations-call-participant-wrapup',
  'get-conversations-call-participant-wrapupcodes',
  'get-conversations-callback',
  'get-conversations-callback-participant-communication-wrapup',
  'get-conversations-callback-participant-wrapup',
  'get-conversations-callback-participant-wrapupcodes',
  'get-conversations-callbacks',
  'get-conversations-calls',
  'get-conversations-calls-history',
  'get-conversations-calls-maximumconferenceparties',
  'get-conversations-cobrowsesession',
  'get-conversations-cobrowsesession-participant-communication-wrapup',
  'get-conversations-cobrowsesession-participant-wrapup',
  'get-conversations-cobrowsesession-participant-wrapupcodes',
  'get-conversations-cobrowsesessions',
  'get-conversations-customattributes-schema',
  'get-conversations-customattributes-schema-version',
  'get-conversations-customattributes-schema-versions',
  'get-conversations-customattributes-schemas',
  'get-conversations-customattributes-schemas-coretype',
  'get-conversations-customattributes-schemas-coretypes',
  'get-conversations-customattributes-schemas-limits',
  'get-conversations-email',
  'get-conversations-email-message',
  'get-conversations-email-messages',
  'get-conversations-email-messages-draft',
  'get-conversations-email-participant-communication-wrapup',
  'get-conversations-email-participant-wrapup',
  'get-conversations-email-participant-wrapupcodes',
  'get-conversations-email-settings',
  'get-conversations-emails',
  'get-conversations-internalmessage',
  'get-conversations-internalmessages',
  'get-conversations-keyconfiguration',
  'get-conversations-keyconfigurations',
  'get-conversations-message',
  'get-conversations-message-communication-messages-media',
  'get-conversations-message-communication-messages-media-media-id',
  'get-conversations-message-details',
  'get-conversations-message-message',
  'get-conversations-message-participant-communication-wrapup',
  'get-conversations-message-participant-wrapup',
  'get-conversations-message-participant-wrapupcodes',
  'get-conversations-messages',
  'get-conversations-messages-cachedmedia',
  'get-conversations-messages-cachedmedia-cached-media-item-id',
  'get-conversations-screenshare-participant-communication-wrapup',
  'get-conversations-settings',
  'get-conversations-social-participant-communication-wrapup',
  'get-conversations-video-details',
  'get-conversations-video-participant-communication-wrapup',
  'get-conversations-videos-meeting',
  'get-conversations-messaging-facebook-app',
  'get-conversations-messaging-facebook-permissions',
  'get-conversations-messaging-identityresolution-integrations-apple-integration-id',
  'get-conversations-messaging-identityresolution-integrations-facebook-integration-id',
  'get-conversations-messaging-identityresolution-integrations-instagram-integration-id',
  'get-conversations-messaging-identityresolution-integrations-open-integration-id',
  'get-conversations-messaging-identityresolution-integrations-twitter-integration-id',
  'get-conversations-messaging-identityresolution-integrations-whatsapp-integration-id',
  'get-conversations-messaging-integration-twitter-oauth-settings',
  'get-conversations-messaging-integrations',
  'get-conversations-messaging-integrations-apple',
  'get-conversations-messaging-integrations-apple-integration-id',
  'get-conversations-messaging-integrations-facebook',
  'get-conversations-messaging-integrations-facebook-integration-id',
  'get-conversations-messaging-integrations-instagram',
  'get-conversations-messaging-integrations-instagram-integration-id',
  'get-conversations-messaging-integrations-open',
  'get-conversations-messaging-integrations-open-extensions-googlebusinessprofile-integration-id',
  'get-conversations-messaging-integrations-open-extensions-googlebusinessprofile-oauth-settings',
  'get-conversations-messaging-integrations-open-extensions-googlebusinessprofile-token',
  'get-conversations-messaging-integrations-open-extensions-googlebusinessprofile-token-accounts',
  'get-conversations-messaging-integrations-open-integration-id',
  'get-conversations-messaging-integrations-twitter',
  'get-conversations-messaging-integrations-twitter-integration-id',
  'get-conversations-messaging-integrations-twitter-oauth-settings',
  'get-conversations-messaging-integrations-whatsapp',
  'get-conversations-messaging-integrations-whatsapp-integration-id',
  'get-conversations-messaging-oauth-apple-callback',
  'get-conversations-messaging-setting',
  'get-conversations-messaging-settings',
  'get-conversations-messaging-settings-default',
  'get-conversations-messaging-supportedcontent',
  'get-conversations-messaging-supportedcontent-default',
  'get-conversations-messaging-supportedcontent-supported-content-id',
  'get-conversations-messaging-threadingtimeline',
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

test('configuration defaults to all tools and validates tool access modes', () => {
  assert.equal(readConfig(env, []).toolAccess, 'all');
  for (const mode of ['read', 'write', 'all']) {
    assert.equal(readConfig({ ...env, MCP_TOOL_ACCESS: mode }, []).toolAccess, mode);
  }
  for (const mode of ['', 'readonly', 'READ', '${MCP_TOOL_ACCESS}']) {
    assert.throws(() => readConfig({ ...env, MCP_TOOL_ACCESS: mode }, []), /MCP_TOOL_ACCESS/);
  }
});

test('configuration disables token persistence by default and supports opting in', () => {
  assert.equal(readConfig(env, []).genesys.persistTokens, false);
  assert.equal(
    readConfig({ ...env, GENESYSCLOUD_PERSIST_TOKENS: 'true' }, []).genesys.persistTokens,
    true,
  );
  assert.throws(
    () => readConfig({ ...env, GENESYSCLOUD_PERSIST_TOKENS: 'no' }, []),
    /GENESYSCLOUD_PERSIST_TOKENS/,
  );
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
  assert.equal(
    readConfig(
      { ...env, GENESYSCLOUD_OAUTHCLIENT_SECRET: '${user_config.oauth_client_secret}' },
      [],
    ).genesys.clientSecret,
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

for (const mode of ['read', 'write', 'all'] as const) {
  for (const transport of ['http', 'stdio'] as const) {
    test(`${transport} keeps current tools available with ${mode} access`, async (t) => {
      const client = new Client({ name: 'test', version: '1.0.0' });
      if (transport === 'http') {
        const config = readConfig({ ...env, MCP_TOOL_ACCESS: mode }, []);
        const listener = createHttpApp('127.0.0.1', config.genesys, config.toolAccess).listen(
          0,
          '127.0.0.1',
        );
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
        t.after(() => client.close());
        await client.connect(
          new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`)),
        );
      } else {
        t.after(() => client.close());
        await client.connect(
          new StdioClientTransport({
            command: process.execPath,
            args: [
              '--input-type=module',
              '-e',
              "import platformClient from 'purecloud-platform-client-v2'; " +
                'platformClient.ApiClient.instance.loginClientCredentialsGrant = async () => ({}); ' +
                "await import('./src/index.ts');",
            ],
            env: { ...env, MCP_TRANSPORT: 'stdio', MCP_TOOL_ACCESS: mode },
            cwd: process.cwd(),
            stderr: 'pipe',
          }),
        );
      }

      const loginTools = ['verify_login', 'invalidate_login'];
      const tools = (await client.listTools()).tools;
      assert.deepEqual(
        tools.map((tool) => tool.name),
        expectedTools,
      );
      for (const tool of tools) {
        assert.equal(tool.annotations?.readOnlyHint, !loginTools.includes(tool.name));
      }
      const result = await client.callTool({ name: 'ping' });
      assert.deepEqual(result.content, [{ type: 'text', text: 'pong' }]);
    });
  }
}
