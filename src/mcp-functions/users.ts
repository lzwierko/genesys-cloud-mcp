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

type UsersApi = InstanceType<typeof platformClient.UsersApi>;

const userExpandValues = [
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

const profileExpandValues = [
  'routingStatus',
  'presence',
  'integrationPresence',
  'conversationSummary',
  'outOfOffice',
  'geolocation',
  'station',
  'authorization',
] as const;

async function getUsersApi() {
  const client = await getGenesysClient();
  return new platformClient.UsersApi(client);
}

function registerUsersGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: UsersApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'UsersApi',
    getUsersApi,
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
  registerUsersGetTool(
    server,
    'getUsers',
    'Get Users',
    'Get the list of available users. Retrieves all pages.',
    ['users', 'users:readonly'],
    [],
    z.object({
      expand: createExpandEnumSchema(userExpandValues, 'Fields to expand on a best effort basis.'),
    }),
    async (api, { expand }) => ({
      entities: await getPagedResponse((params) => api.getUsers(params), {
        ...option('expand', expand),
        pageSize: 100,
        pageNumber: 1,
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUser',
    'Get User by ID',
    'Get user.',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID returned from the get-users tool.'),
      expand: createExpandEnumSchema(userExpandValues, 'Fields to expand on a best effort basis.'),
    }),
    async (api, { userId, expand }) => ({
      entity: await api.getUser(userId, option('expand', expand)),
    }),
    'get-user-by-id',
  );

  registerUsersGetTool(
    server,
    'getUsersMe',
    'Get Current User',
    'Get current user details.',
    ['user-basic-info'],
    [],
    z.object({}),
    async (api) => ({ entity: await api.getUsersMe() }),
    'get-user-me',
  );

  registerUsersGetTool(
    server,
    'getUserState',
    'Get User State',
    'Get user state information.',
    ['users', 'users:readonly'],
    ['directory:userStateChange:view'],
    z.object({
      userId: z.uuid().describe('User ID returned from the get-users tool.'),
    }),
    async (api, { userId }) => ({ entity: await api.getUserState(userId) }),
  );

  registerUsersGetTool(
    server,
    'getAnalyticsUsersAggregatesJob',
    'Get User Aggregate Job Status',
    'Get status for async query for user aggregates',
    ['analytics', 'analytics:readonly'],
    ['analytics:userAggregate:view'],
    z.object({ jobId: z.string().describe('Job ID.') }),
    async (api, { jobId }) => ({
      entity: await api.getAnalyticsUsersAggregatesJob(jobId),
    }),
  );

  registerUsersGetTool(
    server,
    'getAnalyticsUsersAggregatesJobResults',
    'Get User Aggregate Job Results',
    'Fetch a page of results for an async aggregates query',
    ['analytics', 'analytics:readonly'],
    ['analytics:userAggregate:view'],
    z.object({
      jobId: z.string().describe('Job ID.'),
      cursor: z.string().optional().describe('Cursor token to retrieve next page'),
    }),
    async (api, { jobId, cursor }) => ({
      entity: await api.getAnalyticsUsersAggregatesJobResults(jobId, option('cursor', cursor)),
    }),
  );

  registerUsersGetTool(
    server,
    'getAnalyticsUsersDetailsJob',
    'Get User Details Job Status',
    'Get status for async query for user details',
    ['analytics', 'analytics:readonly'],
    ['analytics:userDetail:view'],
    z.object({ jobId: z.string().describe('Job ID.') }),
    async (api, { jobId }) => ({
      entity: await api.getAnalyticsUsersDetailsJob(jobId),
    }),
  );

  registerUsersGetTool(
    server,
    'getAnalyticsUsersDetailsJobResults',
    'Get User Details Job Results',
    'Fetch a page of results for an async query',
    ['analytics', 'analytics:readonly'],
    ['analytics:userDetail:view'],
    z.object({
      jobId: z.string().describe('Job ID.'),
      cursor: z.string().optional().describe('Indicates where to resume query results.'),
      pageSize: z.number().int().optional().describe('The desired maximum number of results.'),
    }),
    async (api, { jobId, cursor, pageSize }) => ({
      entity: await api.getAnalyticsUsersDetailsJobResults(jobId, {
        ...option('cursor', cursor),
        ...option('pageSize', pageSize),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getAnalyticsUsersDetailsJobsAvailability',
    'Get User Details Data Availability',
    'Lookup the datalake availability date and time',
    ['analytics', 'analytics:readonly'],
    ['analytics:userDetail:view'],
    z.object({}),
    async (api) => ({
      entity: await api.getAnalyticsUsersDetailsJobsAvailability(),
    }),
  );

  registerUsersGetTool(
    server,
    'getAuthorizationDivisionspermittedMe',
    'Get My Permitted Divisions',
    'Returns which divisions the current user has the given permission in.',
    ['authorization', 'authorization:readonly'],
    [],
    z.object({
      permission: z.string().describe('Permission string, e.g. routing:queue:view.'),
      name: z.string().optional().describe('Search term to filter by division name.'),
    }),
    async (api, { permission, name }) => ({
      entities: await api.getAuthorizationDivisionspermittedMe(permission, option('name', name)),
    }),
  );

  registerUsersGetTool(
    server,
    'getAuthorizationDivisionspermittedPagedMe',
    'Get My Permitted Divisions Page',
    'Returns which divisions the current user has the given permission in.',
    ['authorization', 'authorization:readonly'],
    [],
    z.object({
      permission: z.string().describe('Permission string, e.g. routing:queue:view.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      pageSize: z.number().int().optional().describe('Page size.'),
    }),
    async (api, input) => ({
      entities: await getPagedResponse(
        (params) => api.getAuthorizationDivisionspermittedPagedMe(input.permission, params),
        {
          pageNumber: input.pageNumber ?? 1,
          pageSize: input.pageSize ?? 100,
        },
      ),
    }),
  );

  registerUsersGetTool(
    server,
    'getAuthorizationDivisionspermittedPagedSubjectId',
    'Get User Permitted Divisions',
    'Returns which divisions the specified user has the given permission in.',
    ['authorization', 'authorization:readonly'],
    [],
    z.object({
      subjectId: z.uuid().describe('Subject ID (user or group).'),
      permission: z.string().describe('Permission string, e.g. routing:queue:view.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      pageSize: z.number().int().optional().describe('Page size.'),
    }),
    async (api, input) => ({
      entities: await getPagedResponse(
        (params) =>
          api.getAuthorizationDivisionspermittedPagedSubjectId(
            input.subjectId,
            input.permission,
            params,
          ),
        {
          pageNumber: input.pageNumber ?? 1,
          pageSize: input.pageSize ?? 100,
        },
      ),
    }),
  );

  registerUsersGetTool(
    server,
    'getAuthorizationSubject',
    'Get User Roles and Permissions',
    'Returns a listing of roles and permissions for a user.',
    ['authorization', 'authorization:readonly'],
    ['authorization:grant:view'],
    z.object({
      subjectId: z.uuid().describe('Subject ID (user or group).'),
      includeDuplicates: z
        .boolean()
        .optional()
        .describe('Include duplicate role and division entries.'),
      includeFullRoles: z
        .boolean()
        .optional()
        .describe('Include full role data and permission policies.'),
    }),
    async (api, { subjectId, includeDuplicates, includeFullRoles }) => ({
      entity: await api.getAuthorizationSubject(subjectId, {
        ...option('includeDuplicates', includeDuplicates),
        ...option('includeFullRoles', includeFullRoles),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getAuthorizationSubjectsMe',
    'Get My Roles and Permissions',
    'Returns a listing of roles and permissions for the currently authenticated user.',
    ['authorization', 'authorization:readonly'],
    [],
    z.object({
      includeDuplicates: z
        .boolean()
        .optional()
        .describe('Include duplicate role and division entries.'),
      includeFullRoles: z
        .boolean()
        .optional()
        .describe('Include full role data and permission policies.'),
    }),
    async (api, { includeDuplicates, includeFullRoles }) => ({
      entity: await api.getAuthorizationSubjectsMe({
        ...option('includeDuplicates', includeDuplicates),
        ...option('includeFullRoles', includeFullRoles),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getFieldconfig',
    'Get User Field Configuration',
    'Fetch field config for an entity type',
    ['users', 'users:readonly'],
    [],
    z.object({
      type: z.enum(['person', 'group', 'org']).describe('Field type.'),
    }),
    async (api, { type }) => ({
      entity: await api.getFieldconfig(type),
    }),
  );

  registerUsersGetTool(
    server,
    'getProfilesUsers',
    'Get User Profiles',
    'Get a user profile listing',
    ['users', 'users:readonly'],
    [],
    z.object({
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      id: z.array(z.uuid()).optional().describe('Filter by user IDs.'),
      jid: z.array(z.string()).optional().describe('Filter by JIDs.'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Ascending or descending sort order.'),
      expand: createExpandEnumSchema(profileExpandValues, 'Which profile fields to expand.'),
      integrationPresenceSource: z
        .enum(['MicrosoftTeams', 'ZoomPhone', 'EightByEight', 'RingCentral'])
        .optional()
        .describe('Integration presence source, used when presence is expanded.'),
    }),
    async (api, input) => {
      const filters = {
        ...option('id', input.id),
        ...option('jid', input.jid),
        ...option('sortOrder', input.sortOrder),
        ...option('expand', input.expand),
        ...option('integrationPresenceSource', input.integrationPresenceSource),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getProfilesUsers({ ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getRoutingDirectroutingbackupSettingsMe',
    'Get My Direct Routing Backup Settings',
    "Get the user's Direct Routing Backup settings.",
    ['routing', 'routing:readonly'],
    ['routing:directRoutingBackup:selfView'],
    z.object({}),
    async (api) => ({
      entity: await api.getRoutingDirectroutingbackupSettingsMe(),
    }),
  );

  registerUsersGetTool(
    server,
    'getRoutingUserDirectroutingbackupSettings',
    'Get User Direct Routing Backup Settings',
    "Get the user's Direct Routing Backup settings.",
    ['routing', 'routing:readonly'],
    ['routing:directRoutingBackup:view'],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getRoutingUserDirectroutingbackupSettings(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getRoutingUserUtilization',
    'Get User Utilization',
    "Get the user's max utilization settings. If not configured, the organization-wide default is returned.",
    ['routing', 'routing:readonly'],
    ['routing:utilization:manage', 'routing:utilization:view'],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getRoutingUserUtilization(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserAdjacents',
    'Get User Adjacents',
    'Get adjacents',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      expand: createExpandEnumSchema(userExpandValues, 'Which user fields, if any, to expand.'),
    }),
    async (api, { userId, expand }) => ({
      entity: await api.getUserAdjacents(userId, option('expand', expand)),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserCallforwarding',
    'Get User Call Forwarding',
    "Get a user's CallForwarding",
    ['users', 'users:readonly'],
    ['conversation:callForwarding:view'],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getUserCallforwarding(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserCustomattribute',
    'Get User Custom Attributes',
    'Get custom attributes by schema id',
    ['users', 'users:readonly'],
    ['directory:user:view'],
    z.object({
      userId: z.uuid().describe('User ID.'),
      schemaId: z.string().describe('Schema ID.'),
    }),
    async (api, { userId, schemaId }) => ({
      entity: await api.getUserCustomattribute(userId, schemaId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserCustomattributesBulk',
    'Get User Custom Attributes for Multiple Schemas',
    'Get multiple custom attributes records by schema ids',
    ['users', 'users:readonly'],
    ['directory:user:view'],
    z.object({
      userId: z.uuid().describe('User ID.'),
      schemaIds: z.array(z.string()).describe('Schema IDs to retrieve.'),
    }),
    async (api, { userId, schemaIds }) => ({
      entities: await api.getUserCustomattributesBulk(userId, schemaIds),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserDirectreports',
    'Get User Direct Reports',
    'Get direct reports',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      expand: createExpandEnumSchema(userExpandValues, 'Which user fields, if any, to expand.'),
    }),
    async (api, { userId, expand }) => ({
      entities: await api.getUserDirectreports(userId, option('expand', expand)),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserExternalid',
    'Get User External Identifiers',
    'Get the external identifiers for a user.',
    ['users', 'users:readonly'],
    [],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entities: await api.getUserExternalid(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserExternalidAuthorityName',
    'Get User External Identifier by Authority',
    'Get the external identifier of user for an authority.',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      authorityName: z.string().describe('Authority name.'),
    }),
    async (api, { userId, authorityName }) => ({
      entity: await api.getUserExternalidAuthorityName(userId, authorityName),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserFavorites',
    'Get User Favorites',
    'Deprecated; will be revived with new contract',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      sortOrder: z.string().optional().describe('Sort order.'),
      expand: createExpandEnumSchema(userExpandValues, 'Which user fields, if any, to expand.'),
    }),
    async (api, input) => {
      const filters = {
        ...option('sortOrder', input.sortOrder),
        ...option('expand', input.expand),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getUserFavorites(input.userId, { ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getUserGeolocation',
    'Get User Geolocation',
    "Get a user's Geolocation",
    ['geolocation', 'geolocation:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      clientId: z.string().describe('Client ID.'),
    }),
    async (api, { userId, clientId }) => ({
      entity: await api.getUserGeolocation(userId, clientId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserOutofoffice',
    'Get User Out of Office',
    'Get a OutOfOffice',
    ['users', 'users:readonly'],
    [],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getUserOutofoffice(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserProfile',
    'Get User Profile',
    'Get user profile',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      expand: createExpandEnumSchema(
        profileExpandValues,
        'Which profile fields, if any, to expand.',
      ),
      integrationPresenceSource: z
        .enum(['MicrosoftTeams', 'ZoomPhone', 'EightByEight', 'RingCentral'])
        .optional()
        .describe('Integration presence source, used when presence is expanded.'),
    }),
    async (api, { userId, expand, integrationPresenceSource }) => ({
      entity: await api.getUserProfile(userId, {
        ...option('expand', expand),
        ...option('integrationPresenceSource', integrationPresenceSource),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserProfileskills',
    'Get User Profile Skills',
    'List profile skills for a user',
    ['users', 'users:readonly'],
    ['directory:userProfile:view'],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entities: await api.getUserProfileskills(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserQueues',
    'Get Queues for User',
    'Get queues for user',
    ['users', 'users:readonly'],
    ['routing:queue:view'],
    z.object({
      userId: z.uuid().describe('User ID.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      joined: z.boolean().optional().describe('Whether the user is joined to the queue.'),
      divisionId: z.array(z.string()).optional().describe('Division IDs.'),
    }),
    async (api, input) => {
      const filters = {
        ...option('joined', input.joined),
        ...option('divisionId', input.divisionId),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getUserQueues(input.userId, { ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getUserRoles',
    'Get User Roles',
    'Returns a listing of roles and permissions for a user.',
    ['authorization', 'authorization:readonly'],
    ['authorization:grant:view'],
    z.object({ subjectId: z.uuid().describe('User ID.') }),
    async (api, { subjectId }) => ({
      entity: await api.getUserRoles(subjectId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserRoutinglanguages',
    'Get User Routing Languages',
    'List routing languages assigned to a user',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Ascending or descending sort order.'),
    }),
    async (api, input) => {
      const filters = option('sortOrder', input.sortOrder);
      return {
        entities: await getPagedResponse(
          (params) => api.getUserRoutinglanguages(input.userId, { ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getUserRoutingskills',
    'Get User Routing Skills',
    'List routing skills assigned to a user',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Ascending or descending sort order.'),
    }),
    async (api, input) => {
      const filters = option('sortOrder', input.sortOrder);
      return {
        entities: await getPagedResponse(
          (params) => api.getUserRoutingskills(input.userId, { ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getUserRoutingstatus',
    'Get User Routing Status',
    'Fetch the routing status of a user',
    ['users', 'users:readonly'],
    [],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getUserRoutingstatus(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserSkillgroups',
    'Get User Skill Groups',
    'Get skill groups for a user',
    ['routing', 'routing:readonly'],
    ['routing:skillGroup:view'],
    z.object({
      userId: z.uuid().describe('User ID.'),
      after: z.string().optional().describe('Cursor that points to the next page.'),
      before: z.string().optional().describe('Cursor that points to the previous page.'),
    }),
    async (api, { userId, after, before }) => ({
      entity: await api.getUserSkillgroups(userId, {
        ...option('after', after),
        ...option('before', before),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserStation',
    'Get User Station',
    'Get station information for user',
    ['users', 'users:readonly'],
    ['telephony:otherStationAssociation:view'],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getUserStation(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserSuperiors',
    'Get User Superiors',
    'Get superiors',
    ['users', 'users:readonly'],
    [],
    z.object({
      userId: z.uuid().describe('User ID.'),
      expand: createExpandEnumSchema(userExpandValues, 'Which user fields, if any, to expand.'),
    }),
    async (api, { userId, expand }) => ({
      entities: await api.getUserSuperiors(userId, option('expand', expand)),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserTrustors',
    'Get User Trustors',
    'List the organizations that have authorized/trusted the user.',
    ['users', 'users:readonly'],
    ['authorization:orgTrustor:view'],
    z.object({
      userId: z.uuid().describe('User ID.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
    }),
    async (api, input) => ({
      entities: await getPagedResponse((params) => api.getUserTrustors(input.userId, params), {
        pageSize: input.pageSize ?? 100,
        pageNumber: input.pageNumber ?? 1,
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUserVerifiers',
    'Get User Verifiers',
    'Get a list of verifiers',
    ['users', 'users:readonly'],
    ['mfa:verifier:view'],
    z.object({ userId: z.uuid().describe('User ID.') }),
    async (api, { userId }) => ({
      entity: await api.getUserVerifiers(userId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersChatsMe',
    'Get My Chats',
    'Get chats for a user',
    ['organization', 'organization:readonly'],
    ['chat:chat:access', 'user:chats:view'],
    z.object({
      excludeClosed: z.boolean().optional().describe('Whether to exclude closed chats.'),
      includePresence: z.boolean().optional().describe('Whether to include user presence.'),
      includeRoomOwners: z.boolean().optional().describe('Whether to include room owners.'),
      after: z.string().optional().describe('Key to start after.'),
    }),
    async (api, { excludeClosed, includePresence, includeRoomOwners, after }) => ({
      entity: await api.getUsersChatsMe({
        ...option('excludeClosed', excludeClosed),
        ...option('includePresence', includePresence),
        ...option('includeRoomOwners', includeRoomOwners),
        ...option('after', after),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchema',
    'Get User Custom Attributes Schema',
    'Get a schema',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({ schemaId: z.string().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entity: await api.getUsersCustomattributesSchema(schemaId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchemaVersion',
    'Get User Custom Attributes Schema Version',
    'Get a specific version of a schema',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({
      schemaId: z.string().describe('Schema ID.'),
      versionId: z.string().describe('Schema version ID.'),
    }),
    async (api, { schemaId, versionId }) => ({
      entity: await api.getUsersCustomattributesSchemaVersion(schemaId, versionId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchemaVersions',
    'Get User Custom Attributes Schema Versions',
    'Get all versions of a user schema',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({ schemaId: z.string().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entity: await api.getUsersCustomattributesSchemaVersions(schemaId),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchemas',
    'Get User Custom Attributes Schemas',
    'Get a list of schemas.',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({}),
    async (api) => ({
      entity: await api.getUsersCustomattributesSchemas(),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchemasCoretype',
    'Get User Custom Attributes Core Type',
    'Get the core types from which all schemas are built.',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({ coreTypeName: z.string().describe('Name of the core type.') }),
    async (api, { coreTypeName }) => ({
      entity: await api.getUsersCustomattributesSchemasCoretype(coreTypeName),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchemasCoretypes',
    'Get User Custom Attributes Core Types',
    'Get the list of core types enabled for a specific namespace.',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({}),
    async (api) => ({
      entity: await api.getUsersCustomattributesSchemasCoretypes(),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersCustomattributesSchemasLimits',
    'Get User Custom Attributes Schema Limits',
    'Get quantitative limits on schemas',
    ['users', 'users:readonly'],
    ['users:customAttributesSchema:view'],
    z.object({}),
    async (api) => ({
      entity: await api.getUsersCustomattributesSchemasLimits(),
    }),
  );

  const developmentActivityFilters = {
    moduleId: z.string().optional().describe('Learning module ID.'),
    interval: z.string().optional().describe('ISO-8601 due-date interval; maximum one year.'),
    completionInterval: z
      .string()
      .optional()
      .describe('ISO-8601 completion-date interval; maximum one year.'),
    overdue: z.enum(['True', 'False', 'Any']).optional().describe('Filter by overdue state.'),
    pass: z.enum(['True', 'False', 'Any']).optional().describe('Filter by pass/fail state.'),
    pageSize: z.number().int().optional().describe('Page size.'),
    pageNumber: z.number().int().optional().describe('Page number.'),
    sortOrder: z.enum(['Asc', 'Desc']).optional().describe('Sort by due date.'),
    types: z
      .array(
        z.enum([
          'Informational',
          'Coaching',
          'AssessedContent',
          'Assessment',
          'External',
          'Native',
        ]),
      )
      .optional()
      .describe('Development activity types.'),
    statuses: z
      .array(z.enum(['Planned', 'InProgress', 'Completed', 'InvalidSchedule', 'NotCompleted']))
      .optional()
      .describe('Development activity statuses.'),
    relationship: z
      .array(z.enum(['Creator', 'Facilitator', 'Attendee']))
      .optional()
      .describe('Current user relationship to the activity.'),
  };

  registerUsersGetTool(
    server,
    'getUsersDevelopmentActivities',
    'Get Development Activities',
    'Get list of Development Activities',
    ['coaching', 'coaching:readonly', 'learning', 'learning:readonly'],
    ['learning:assignment:view', 'coaching:appointment:view'],
    z.object({
      userId: z.array(z.uuid()).optional().describe('User IDs to query, up to 100.'),
      ...developmentActivityFilters,
    }),
    async (api, input) => {
      const filters = {
        ...option('userId', input.userId),
        ...option('moduleId', input.moduleId),
        ...option('interval', input.interval),
        ...option('completionInterval', input.completionInterval),
        ...option('overdue', input.overdue),
        ...option('pass', input.pass),
        ...option('sortOrder', input.sortOrder),
        ...option('types', input.types),
        ...option('statuses', input.statuses),
        ...option('relationship', input.relationship),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getUsersDevelopmentActivities({ ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getUsersDevelopmentActivitiesMe',
    'Get My Development Activities',
    'Get list of Development Activities for current user',
    ['coaching', 'coaching:readonly', 'learning', 'learning:readonly'],
    [],
    z.object(developmentActivityFilters),
    async (api, input) => {
      const filters = {
        ...option('moduleId', input.moduleId),
        ...option('interval', input.interval),
        ...option('completionInterval', input.completionInterval),
        ...option('overdue', input.overdue),
        ...option('pass', input.pass),
        ...option('sortOrder', input.sortOrder),
        ...option('types', input.types),
        ...option('statuses', input.statuses),
        ...option('relationship', input.relationship),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getUsersDevelopmentActivitiesMe({ ...filters, ...params }),
          {
            ...filters,
            pageSize: input.pageSize ?? 100,
            pageNumber: input.pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerUsersGetTool(
    server,
    'getUsersDevelopmentActivity',
    'Get Development Activity',
    'Get a Development Activity',
    ['coaching', 'coaching:readonly', 'learning', 'learning:readonly'],
    ['learning:assignment:view', 'coaching:appointment:view'],
    z.object({
      activityId: z.string().describe('Activity ID.'),
      type: z
        .enum(['Informational', 'Coaching', 'AssessedContent', 'Assessment', 'External', 'Native'])
        .describe('Activity type.'),
    }),
    async (api, { activityId, type }) => ({
      entity: await api.getUsersDevelopmentActivity(activityId, type),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersExternalidAuthorityNameExternalKey',
    'Get User by External Identifier',
    'Get the user associated with external identifier.',
    ['users', 'users:readonly'],
    [],
    z.object({
      authorityName: z.string().describe('Authority name.'),
      externalKey: z.string().describe('External key.'),
      expand: createExpandEnumSchema(userExpandValues, 'Which user fields, if any, to expand.'),
    }),
    async (api, { authorityName, externalKey, expand }) => ({
      entity: await api.getUsersExternalidAuthorityNameExternalKey(
        authorityName,
        externalKey,
        option('expand', expand),
      ),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersMeVerifiers',
    'Get My Verifiers',
    'Get a list of my verifiers',
    ['users', 'users:readonly'],
    [],
    z.object({}),
    async (api) => ({
      entity: await api.getUsersMeVerifiers(),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersQuery',
    'Query Users',
    'Get list of available users, paged by cursor token, No division filtering available so directory:user:view permission for all divisions is required',
    ['users', 'users:readonly'],
    ['directory:user:view'],
    z.object({
      cursor: z.string().optional().describe('Cursor token to retrieve next page.'),
      pageSize: z.number().int().optional().describe('Page size.'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Ascending or descending sort order.'),
      expand: createExpandEnumSchema(
        userExpandValues,
        'Which user fields to expand, resolved on a best-effort basis.',
      ),
      integrationPresenceSource: z
        .enum(['MicrosoftTeams', 'ZoomPhone', 'EightByEight', 'RingCentral'])
        .optional()
        .describe('Integration presence source, used when presence is expanded.'),
      userCustomAttributeSchemaIds: z
        .array(z.string())
        .optional()
        .describe(
          'Custom attribute schema IDs; only used with customAttributes expansion (maximum 5).',
        ),
      state: z
        .enum(['active', 'inactive', 'deleted', 'any'])
        .optional()
        .describe('User state filter.'),
    }),
    async (api, input) => ({
      entity: await api.getUsersQuery({
        ...option('cursor', input.cursor),
        ...option('pageSize', input.pageSize),
        ...option('sortOrder', input.sortOrder),
        ...option('expand', input.expand),
        ...option('integrationPresenceSource', input.integrationPresenceSource),
        ...option('userCustomAttributeSchemaIds', input.userCustomAttributeSchemaIds),
        ...option('state', input.state),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersSearch',
    'Search Users',
    'Search users using the q64 value returned from a previous search',
    ['users', 'users:readonly'],
    ['directory:user:view'],
    z.object({
      q64: z.string().describe('q64 search value returned from a previous search.'),
      expand: z.array(z.string()).optional().describe('Fields to expand.'),
      integrationPresenceSource: z
        .enum(['MicrosoftTeams', 'ZoomPhone', 'EightByEight', 'RingCentral'])
        .optional()
        .describe('Integration presence source.'),
    }),
    async (api, { q64, expand, integrationPresenceSource }) => ({
      entity: await api.getUsersSearch(q64, {
        ...option('expand', expand),
        ...option('integrationPresenceSource', integrationPresenceSource),
      }),
    }),
  );

  registerUsersGetTool(
    server,
    'getUsersStationsMe',
    'Get My Station',
    'Get station information for self',
    ['users', 'users:readonly'],
    ['telephony:selfStationAssociation:view'],
    z.object({}),
    async (api) => ({
      entity: await api.getUsersStationsMe(),
    }),
  );
}

export { registerFunctions as gcUsersRegisterFunctions };
