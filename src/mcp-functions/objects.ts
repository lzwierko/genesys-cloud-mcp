import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getGenesysClient } from '../genesys.ts';
import platformClient from 'purecloud-platform-client-v2';
import { getPagedResponse, option, registerApiGetTool } from './genesys-common.ts';
import { z } from 'zod';

type ObjectsApi = InstanceType<typeof platformClient.ObjectsApi>;

async function getObjectsApi() {
  const client = await getGenesysClient();
  return new platformClient.ObjectsApi(client);
}

function registerObjectsGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: ObjectsApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'ObjectsApi',
    getObjectsApi,
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

const divisionScopes = ['authorization', 'authorization:readonly'];

function registerFunctions(server: McpServer) {
  registerObjectsGetTool(
    server,
    'getAuthorizationDivision',
    'Get Authorization Division',
    'Returns an authorization division.',
    divisionScopes,
    [],
    z.object({
      divisionId: z.uuid().describe('Division ID.'),
      objectCount: z
        .boolean()
        .optional()
        .describe('Get count of objects in this division, grouped by type.'),
    }),
    async (api, { divisionId, objectCount }) => ({
      entity: await api.getAuthorizationDivision(divisionId, option('objectCount', objectCount)),
    }),
  );

  registerObjectsGetTool(
    server,
    'getAuthorizationDivisions',
    'Get Authorization Divisions',
    'Retrieve a list of all divisions defined for the organization. Request specific divisions by ' +
      'id using the id filter. Retrieves all pages.',
    divisionScopes,
    [],
    z.object({
      sortBy: z.string().optional().describe('Variable name requested to sort by.'),
      expand: z.array(z.string()).optional().describe('Variable name requested by expand list.'),
      objectCount: z
        .boolean()
        .optional()
        .describe('Include the count of objects contained in the division.'),
      id: z
        .array(z.uuid())
        .optional()
        .describe('Optionally request specific divisions by their IDs.'),
      name: z.string().optional().describe('Search term to filter by division name.'),
    }),
    async (api, { sortBy, expand, objectCount, id, name }) => ({
      entities: await getPagedResponse((params) => api.getAuthorizationDivisions(params), {
        ...option('sortBy', sortBy),
        ...option('expand', expand),
        ...option('objectCount', objectCount),
        ...option('id', id),
        ...option('name', name),
        pageSize: 100,
        pageNumber: 1,
      }),
    }),
  );

  registerObjectsGetTool(
    server,
    'getAuthorizationDivisionsDeleted',
    'Get Deleted Authorization Divisions',
    'Get a list of soft deleted divisions for the org. Retrieves all pages.',
    divisionScopes,
    ['authorization:divisionDeleted:view'],
    z.object({}),
    async (api) => ({
      entities: await getPagedResponse((params) => api.getAuthorizationDivisionsDeleted(params), {
        pageSize: 100,
        pageNumber: 1,
      }),
    }),
  );

  registerObjectsGetTool(
    server,
    'getAuthorizationDivisionsHome',
    'Get Home Authorization Division',
    'Retrieve the home division for the organization. Will not include object counts.',
    divisionScopes,
    [],
    z.object({}),
    async (api) => ({
      entity: await api.getAuthorizationDivisionsHome(),
    }),
  );

  registerObjectsGetTool(
    server,
    'getAuthorizationDivisionsLimit',
    'Get Authorization Divisions Limit',
    'Returns the maximum allowed number of divisions.',
    divisionScopes,
    [],
    z.object({}),
    async (api) => ({
      limit: await api.getAuthorizationDivisionsLimit(),
    }),
  );

  registerObjectsGetTool(
    server,
    'getAuthorizationDivisionsQuery',
    'Query Authorization Divisions',
    'Retrieve a list of all divisions defined for the organization with cursor. Use the "before" ' +
      'and "after" params to fetch the next/previous page using the cursor returned in nextUri/' +
      'previousUri; this tool returns a single page.',
    divisionScopes,
    [],
    z.object({
      before: z
        .string()
        .optional()
        .describe(
          'The cursor that points to the start of the set of entities that has been returned.',
        ),
      after: z
        .string()
        .optional()
        .describe(
          'The cursor that points to the end of the set of entities that has been returned.',
        ),
      pageSize: z.string().optional().describe('Page size (max 200, default 25).'),
      id: z
        .array(z.uuid())
        .optional()
        .describe('Optionally request specific divisions by their IDs.'),
      name: z
        .string()
        .optional()
        .describe('Optionally request specific divisions by division name.'),
    }),
    async (api, { before, after, pageSize, id, name }) => {
      const response = await api.getAuthorizationDivisionsQuery({
        ...option('before', before),
        ...option('after', after),
        ...option('pageSize', pageSize),
        ...option('id', id),
        ...option('name', name),
      });
      return {
        entities: response.entities ?? [],
        nextUri: response.nextUri,
        previousUri: response.previousUri,
        selfUri: response.selfUri,
      };
    },
  );
}

export function gcObjectsRegisterFunctions(server: McpServer) {
  registerFunctions(server);
}
