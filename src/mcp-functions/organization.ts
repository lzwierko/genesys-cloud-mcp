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

type OrganizationApi = InstanceType<typeof platformClient.OrganizationApi>;

const limitChangeRequestStatusValues = [
  'Approved',
  'Rejected',
  'Rollback',
  'Pending',
  'Open',
  'SecondaryApprovalNamespacesAdded',
  'ReviewerApproved',
  'ReviewerRejected',
  'ReviewerRollback',
  'ImplementingChange',
  'ChangeImplemented',
  'ImplementingRollback',
  'RollbackImplemented',
] as const;

const limitChangeRequestExpandValues = ['statusHistory'] as const;

async function getOrganizationApi() {
  const client = await getGenesysClient();
  return new platformClient.OrganizationApi(client);
}

function registerOrganizationGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: OrganizationApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'OrganizationApi',
    getOrganizationApi,
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
  // Also implemented by the Users domain as `get-fieldconfig` (UsersApi.getFieldconfig hits the
  // same /api/v2/fieldconfig endpoint). Renamed here to avoid a duplicate tool name once every
  // domain module is registered on the same MCP server.
  registerOrganizationGetTool(
    server,
    'getFieldconfig',
    'Get Organization Field Configuration',
    'Fetch field config for an entity type. Deprecated by Genesys Cloud.',
    ['users', 'users:readonly'],
    [],
    z.object({
      type: z.enum(['person', 'group', 'org']).describe('Field type.'),
    }),
    async (api, { type }) => ({
      entity: await api.getFieldconfig(type),
    }),
    'get-organization-fieldconfig',
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsAuthenticationSettings',
    'Get Organization Authentication Settings',
    "Gets the organization's settings.",
    ['organization', 'organization:readonly'],
    ['directory:organization:admin'],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsAuthenticationSettings() }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsEmbeddedintegration',
    'Get Organization Embedded Integration Domains',
    'Get the list of domains that will be allowed to embed PureCloud applications. Deprecated; use get-organizations-authentication-settings instead.',
    ['organization', 'organization:readonly'],
    [],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsEmbeddedintegration() }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsIpaddressauthentication',
    'Get Organization IP Address Authentication Settings',
    'Get organization IP address whitelist settings. Deprecated; use get-organizations-authentication-settings instead.',
    ['organization', 'organization:readonly'],
    ['directory:organization:admin'],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsIpaddressauthentication() }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsChangerequest',
    'Get Organization Limit Change Request',
    'Get a limit change request.',
    ['organization', 'organization:readonly'],
    ['limits:organization:view'],
    z.object({
      requestId: z.string().describe('Unique id for the limit change request.'),
    }),
    async (api, { requestId }) => ({
      entity: await api.getOrganizationsLimitsChangerequest(requestId),
    }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsChangerequests',
    'Get Organization Limit Change Requests',
    'Get the available limit change requests. Timestamp interval defaults to the last 365 days if both after and before are omitted. If only one parameter is omitted, the interval will default to a 180 day range in the specified direction. Returns a single page; use the response nextUri for additional pages.',
    ['organization', 'organization:readonly'],
    ['limits:organization:view'],
    z.object({
      after: z
        .number()
        .int()
        .optional()
        .describe('Timestamp indicating the date to begin after when searching for requests.'),
      before: z
        .number()
        .int()
        .optional()
        .describe('Timestamp indicating the date to end before when searching for requests.'),
      status: z
        .enum(limitChangeRequestStatusValues)
        .optional()
        .describe('Status of the request to be filtered by.'),
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
      expand: createExpandEnumSchema(
        limitChangeRequestExpandValues,
        'Which fields, if any, to expand.',
      ),
    }),
    async (api, { after, before, status, pageSize, expand }) => ({
      entity: await api.getOrganizationsLimitsChangerequests({
        ...option('after', after),
        ...option('before', before),
        ...option('status', status),
        ...option('pageSize', pageSize),
        ...option('expand', expand),
      }),
    }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsDocs',
    'Get Organization Limit Documentation',
    'Get limit documentation.',
    ['organization', 'organization:readonly'],
    [],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsLimitsDocs() }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsDocsFreetrial',
    'Get Organization Free Trial Limit Documentation',
    'Get free trial limit documentation.',
    ['organization', 'organization:readonly'],
    [],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsLimitsDocsFreetrial() }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsNamespace',
    'Get Organization Namespace Limits',
    'Get the effective limits in a namespace for an organization.',
    ['organization', 'organization:readonly'],
    [],
    z.object({
      namespaceName: z.string().describe('The namespace to fetch limits for.'),
    }),
    async (api, { namespaceName }) => ({
      entities: (await api.getOrganizationsLimitsNamespace(namespaceName)).entities ?? [],
    }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsNamespaceDefaults',
    'Get Organization Namespace Default Limits',
    'Get the default limits in a namespace for an organization.',
    ['organization', 'organization:readonly'],
    [],
    z.object({
      namespaceName: z.string().describe('The namespace to fetch default limits for.'),
    }),
    async (api, { namespaceName }) => ({
      entities: (await api.getOrganizationsLimitsNamespaceDefaults(namespaceName)).entities ?? [],
    }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsLimitsNamespaces',
    'Get Organization Limit Namespaces',
    'Get the available limit namespaces. Retrieves all pages.',
    ['organization', 'organization:readonly'],
    [],
    z.object({
      pageSize: z.number().int().optional().describe('Page size.'),
      pageNumber: z.number().int().optional().describe('Page number.'),
    }),
    async (api, { pageSize, pageNumber }) => ({
      // The published Swagger schema (and the generated SDK types) leave this response
      // untyped (`object`), so the entities array is accessed via a minimal local shape
      // instead of inventing a duplicate model.
      entities: await getPagedResponse(
        (params) =>
          api.getOrganizationsLimitsNamespaces(params) as Promise<{
            entities?: Record<string, unknown>[];
          }>,
        {
          pageSize: pageSize ?? 100,
          pageNumber: pageNumber ?? 1,
        },
      ),
    }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsMe',
    'Get Organization',
    'Get organization.',
    ['organization', 'organization:readonly'],
    [],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsMe() }),
  );

  registerOrganizationGetTool(
    server,
    'getOrganizationsWhitelist',
    'Get Organization Whitelist Settings',
    'Get the list of domains that will be allowed to embed PureCloud applications. Deprecated; use get-organizations-authentication-settings instead.',
    ['organization', 'organization:readonly'],
    [],
    z.object({}),
    async (api) => ({ entity: await api.getOrganizationsWhitelist() }),
  );
}

export function gcOrganizationRegisterFunctions(server: McpServer) {
  registerFunctions(server);
}
