import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getGenesysClient } from '../genesys.ts';
import platformClient from 'purecloud-platform-client-v2';
import { getPagedResponse, option, registerApiGetTool } from './genesys-common.ts';
import { z } from 'zod';

type PresenceApi = InstanceType<typeof platformClient.PresenceApi>;

const presenceLocaleCodeValues = [
  'ALL',
  'he',
  'fr',
  'en_US',
  'da',
  'de',
  'it',
  'cs',
  'es',
  'fi',
  'ar',
  'ja',
  'ko',
  'nl',
  'no',
  'pl',
  'pt_BR',
  'pt_PT',
  'ru',
  'sv',
  'th',
  'tr',
  'uk',
  'zh_CN',
  'zh_TW',
] as const;

async function getPresenceApi() {
  const client = await getGenesysClient();
  return new platformClient.PresenceApi(client);
}

function registerPresenceGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: PresenceApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'PresenceApi',
    getPresenceApi,
    methodName,
    title,
    summary,
    scopes,
    permissions,
    inputSchema,
    execute,
    toolName,
  );
}

function registerFunctions(server: McpServer) {
  registerPresenceGetTool(
    server,
    'getPresenceDefinition0',
    'Get Presence Definition',
    'Get a Presence Definition.',
    ['presence', 'presence:readonly'],
    ['presence:presenceDefinition:view'],
    z.object({
      definitionId: z.uuid().describe('Presence Definition ID.'),
      localeCode: z
        .enum(presenceLocaleCodeValues)
        .optional()
        .describe(
          'The locale code to fetch for the presence definition. Use ALL to fetch everything.',
        ),
    }),
    async (api, { definitionId, localeCode }) => ({
      entity: await api.getPresenceDefinition0(definitionId, option('localeCode', localeCode)),
    }),
    'get-presence-definition',
  );

  registerPresenceGetTool(
    server,
    'getPresenceDefinitions0',
    'Get Presence Definitions',
    'Get a list of Presence Definitions. View permission enforcement only applies to presence definitions assigned to a division.',
    ['presence', 'presence:readonly'],
    ['presence:presenceDefinition:view'],
    z.object({
      deactivated: z
        .string()
        .optional()
        .describe('Deactivated query can be TRUE or FALSE. Defaults to false.'),
      divisionId: z
        .array(z.uuid())
        .optional()
        .describe(
          'One or more division IDs. If nothing is provided, the definitions associated with the list of divisions that the user has access to will be returned.',
        ),
      localeCode: z
        .enum(presenceLocaleCodeValues)
        .optional()
        .describe(
          'The locale code to fetch for the presence definition. Use ALL to fetch everything.',
        ),
    }),
    async (api, { deactivated, divisionId, localeCode }) => ({
      entity: await api.getPresenceDefinitions0({
        ...option('deactivated', deactivated),
        ...option('divisionId', divisionId),
        ...option('localeCode', localeCode),
      }),
    }),
    'get-presence-definitions',
  );

  registerPresenceGetTool(
    server,
    'getPresenceSettings',
    'Get Presence Settings',
    'Get the presence settings.',
    ['presence', 'presence:readonly'],
    ['presence:settings:view'],
    z.object({}),
    async (api) => ({ entity: await api.getPresenceSettings() }),
  );

  registerPresenceGetTool(
    server,
    'getPresenceSource',
    'Get Presence Source',
    'Get a Presence Source.',
    ['presence', 'presence:readonly'],
    ['presence:source:view'],
    z.object({ sourceId: z.uuid().describe('Presence Source ID.') }),
    async (api, { sourceId }) => ({ entity: await api.getPresenceSource(sourceId) }),
  );

  registerPresenceGetTool(
    server,
    'getPresenceSources',
    'Get Presence Sources',
    'Get a list of Presence Sources.',
    ['presence', 'presence:readonly'],
    ['presence:source:view'],
    z.object({
      deactivated: z
        .string()
        .optional()
        .describe('Deactivated query can be TRUE or FALSE. Defaults to false.'),
    }),
    async (api, { deactivated }) => ({
      entity: await api.getPresenceSources(option('deactivated', deactivated)),
    }),
  );

  registerPresenceGetTool(
    server,
    'getPresenceUserPrimarysource',
    "Get User's Primary Presence Source",
    "Get a user's Primary Presence Source.",
    ['presence', 'presence:readonly'],
    ['presence:userPrimarySource:view'],
    z.object({ userId: z.uuid().describe('User ID returned from the get-users tool.') }),
    async (api, { userId }) => ({ entity: await api.getPresenceUserPrimarysource(userId) }),
  );

  registerPresenceGetTool(
    server,
    'getPresencedefinition',
    'Get Presence Definition (Legacy)',
    'Get a Presence Definition. Deprecated: apps should migrate to use the get-presence-definition tool (GET /api/v2/presence/definitions/{definitionId}) instead.',
    ['presence', 'presence:readonly'],
    ['presence:presenceDefinition:view'],
    z.object({
      presenceId: z.uuid().describe('Organization Presence ID.'),
      localeCode: z
        .string()
        .optional()
        .describe(
          'The locale code to fetch for the presence definition. Use ALL to fetch everything.',
        ),
    }),
    async (api, { presenceId, localeCode }) => ({
      entity: await api.getPresencedefinition(presenceId, option('localeCode', localeCode)),
    }),
  );

  registerPresenceGetTool(
    server,
    'getPresencedefinitions',
    'Get Presence Definitions (Legacy)',
    "Get an Organization's list of Presence Definitions. Deprecated: apps should migrate to use the get-presence-definitions tool (GET /api/v2/presence/definitions) instead. Retrieves all pages.",
    ['presence', 'presence:readonly'],
    [],
    z.object({
      deleted: z
        .string()
        .optional()
        .describe('Deleted query can be TRUE, FALSE or ALL. Defaults to false.'),
      localeCode: z
        .string()
        .optional()
        .describe(
          'The locale code to fetch for each presence definition. Use ALL to fetch everything.',
        ),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
    }),
    async (api, { deleted, localeCode, pageNumber, pageSize }) => ({
      entities: await getPagedResponse((params) => api.getPresencedefinitions(params), {
        ...option('deleted', deleted),
        ...option('localeCode', localeCode),
        pageNumber: pageNumber ?? 1,
        pageSize: pageSize ?? 25,
      }),
    }),
  );

  registerPresenceGetTool(
    server,
    'getSystempresences',
    'Get System Presences',
    'Get the list of SystemPresences.',
    ['presence', 'presence:readonly'],
    [],
    z.object({}),
    async (api) => ({ entities: await api.getSystempresences() }),
  );

  registerPresenceGetTool(
    server,
    'getUserPresence',
    "Get User's Presence",
    'Get a users presence for the specified source that is not specifically listed. Used to support custom presence sources. This endpoint does not support registered presence sources.',
    ['presence', 'presence:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID returned from the get-users tool.'),
      sourceId: z.uuid().describe('Presence source ID.'),
    }),
    async (api, { userId, sourceId }) => ({ entity: await api.getUserPresence(userId, sourceId) }),
  );

  registerPresenceGetTool(
    server,
    'getUserPresencesPurecloud',
    "Get User's Genesys Cloud Presence",
    "Get a user's Genesys Cloud presence. Get the default Genesys Cloud user presence source PURECLOUD.",
    ['presence', 'presence:readonly'],
    [],
    z.object({ userId: z.uuid().describe('User ID returned from the get-users tool.') }),
    async (api, { userId }) => ({ entity: await api.getUserPresencesPurecloud(userId) }),
  );

  registerPresenceGetTool(
    server,
    'getUsersPresenceBulk',
    'Get Bulk User Presences',
    'Get bulk user presences for a single presence source.',
    ['presence', 'presence:readonly'],
    [],
    z.object({
      sourceId: z.uuid().describe('The requested presence source ID.'),
      id: z
        .array(z.uuid())
        .optional()
        .describe('User IDs to fetch their presence status in bulk. Limit 50.'),
    }),
    async (api, { sourceId, id }) => ({
      entities: await api.getUsersPresenceBulk(sourceId, option('id', id)),
    }),
  );

  registerPresenceGetTool(
    server,
    'getUsersPresencesPurecloudBulk',
    'Get Bulk User Genesys Cloud Presences',
    'Get bulk user presences for a Genesys Cloud (PURECLOUD) presence source.',
    ['presence', 'presence:readonly'],
    [],
    z.object({
      id: z
        .array(z.uuid())
        .optional()
        .describe('User IDs to fetch their presence status in bulk. Limit 50.'),
    }),
    async (api, { id }) => ({
      entities: await api.getUsersPresencesPurecloudBulk(option('id', id)),
    }),
  );
}

export { registerFunctions as gcPresenceRegisterFunctions };
