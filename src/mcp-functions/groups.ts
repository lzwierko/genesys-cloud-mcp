import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getGenesysClient } from '../genesys.ts';
import platformClient from 'purecloud-platform-client-v2';
import {
  createExpandEnumSchema,
  getPagedResponse,
  option,
  registerApiGetTool,
} from './genesys-common.ts';
import { z } from 'zod';

type GroupsApi = InstanceType<typeof platformClient.GroupsApi>;

// Matches the "expand" values documented for GET /api/v2/groups/{groupId}/members; these expand
// fields apply to the member User entities returned alongside each group member.
const groupMemberExpandValues = [
  'routingStatus',
  'presence',
  'integrationPresence',
  'conversationSummary',
  'outOfOffice',
  'geolocation',
  'station',
  'authorization',
  'lasttokenissued',
  'authorization.unusedRoles',
  'team',
  'workPlanBidRanks',
  'externalContactsSettings',
  'groups',
  'customAttributes',
  'profileSkills',
  'certifications',
  'locations',
  'skills',
  'languages',
  'languagePreference',
  'employerInfo',
  'biography',
  'dateLastLogin',
  'dateWelcomeSent',
] as const;

async function getGroupsApi() {
  const client = await getGenesysClient();
  return new platformClient.GroupsApi(client);
}

function registerGroupsGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: GroupsApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'GroupsApi',
    getGroupsApi,
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
  registerGroupsGetTool(
    server,
    'getGroups',
    'Get Groups',
    'Get a group list. Retrieves all pages.',
    ['groups', 'groups:readonly'],
    [],
    z.object({
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      id: z.array(z.uuid()).optional().describe('Filter by group IDs.'),
      jabberId: z
        .array(z.string())
        .optional()
        .describe('A list of jabberIds to fetch by bulk (cannot be used with the id parameter).'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Ascending or descending sort order.'),
    }),
    async (api, input) => {
      const filters = {
        ...option('id', input.id),
        ...option('jabberId', input.jabberId),
        ...option('sortOrder', input.sortOrder),
      };
      return {
        entities: await getPagedResponse((params) => api.getGroups({ ...filters, ...params }), {
          ...filters,
          pageSize: input.pageSize ?? 100,
          pageNumber: input.pageNumber ?? 1,
        }),
      };
    },
  );

  registerGroupsGetTool(
    server,
    'getGroup',
    'Get Group by ID',
    'Get group.',
    ['groups', 'groups:readonly'],
    [],
    z.object({ groupId: z.uuid().describe('Group ID returned from the get-groups tool.') }),
    async (api, { groupId }) => ({ entity: await api.getGroup(groupId) }),
  );

  registerGroupsGetTool(
    server,
    'getGroupDynamicsettings',
    'Get Group Dynamic Membership Settings',
    'Get dynamic group definition. Not documented in the public Genesys Cloud API schema; ' +
      "implemented directly from the installed SDK, which marks it a preview method 'subject to " +
      "both breaking and non-breaking changes at any time without notice'. OAuth scopes are " +
      'inferred from the other groups endpoints, not confirmed by Swagger.',
    ['groups', 'groups:readonly'],
    [],
    z.object({ groupId: z.uuid().describe('Group ID.') }),
    async (api, { groupId }) => ({ entity: await api.getGroupDynamicsettings(groupId) }),
  );

  registerGroupsGetTool(
    server,
    'getGroupIndividuals',
    'Get Group Individuals',
    'Get all individuals associated with the group.',
    ['groups', 'groups:readonly'],
    [],
    z.object({ groupId: z.uuid().describe('Group ID.') }),
    async (api, { groupId }) => ({
      entities: (await api.getGroupIndividuals(groupId)).entities,
    }),
  );

  registerGroupsGetTool(
    server,
    'getGroupMembers',
    'Get Group Members',
    'Get group members, includes individuals, owners, and dynamically included people.',
    ['groups', 'groups:readonly'],
    [],
    z.object({
      groupId: z.uuid().describe('Group ID.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Ascending or descending sort order.'),
      expand: createExpandEnumSchema(groupMemberExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, input) => {
      const filters = {
        ...option('sortOrder', input.sortOrder),
        ...option('expand', input.expand),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getGroupMembers(input.groupId, { ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerGroupsGetTool(
    server,
    'getGroupProfile',
    'Get Group Profile',
    'Get group profile. This api is deprecated. Use the get-groups/get-group tools instead.',
    ['groups', 'groups:readonly'],
    [],
    z.object({
      groupId: z.uuid().describe('Group ID.'),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma separated fields to return. Allowable values can be found by querying the ' +
            'get-group-fieldconfig tool with type "group" and using the key for the elements ' +
            'returned by the fieldList.',
        ),
    }),
    async (api, { groupId, fields }) => ({
      entity: await api.getGroupProfile(groupId, option('fields', fields)),
    }),
  );

  registerGroupsGetTool(
    server,
    'getGroupsSearch',
    'Search Groups by Cursor',
    'Search groups using the q64 value returned from a previous search.',
    ['groups', 'groups:readonly'],
    [],
    z.object({
      q64: z.string().describe('q64 search value returned from a previous search.'),
      expand: z.array(z.string()).optional().describe('Fields to expand.'),
    }),
    async (api, { q64, expand }) => ({
      entity: await api.getGroupsSearch(q64, option('expand', expand)),
    }),
  );

  registerGroupsGetTool(
    server,
    'getFieldconfig',
    'Get Group Field Configuration',
    'Fetch field config for an entity type (person, group, or org). Deprecated per Swagger.',
    ['users', 'users:readonly'],
    [],
    z.object({ type: z.enum(['person', 'group', 'org']).describe('Field type.') }),
    async (api, { type }) => ({ entity: await api.getFieldconfig(type) }),
    'get-group-fieldconfig',
  );

  registerGroupsGetTool(
    server,
    'getProfilesGroups',
    'Get Group Profiles',
    'Get group profile listing. This api is deprecated. Use the get-groups tool instead. ' +
      'Retrieves all pages.',
    ['groups', 'groups:readonly'],
    [],
    z.object({
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      id: z.array(z.uuid()).optional().describe('Filter by group IDs.'),
      jabberId: z
        .array(z.string())
        .optional()
        .describe('A list of jabberIds to fetch by bulk (cannot be used with the id parameter).'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Ascending or descending sort order.'),
    }),
    async (api, input) => {
      const filters = {
        ...option('id', input.id),
        ...option('jabberId', input.jabberId),
        ...option('sortOrder', input.sortOrder),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getProfilesGroups({ ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );
}

export { registerFunctions as gcGroupsRegisterFunctions };
