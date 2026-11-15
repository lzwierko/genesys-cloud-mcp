import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getGenesysClient } from '../genesys.ts';
import platformClient from 'purecloud-platform-client-v2';
import { getPagedResponse, registerApiGetTool } from './genesys-common.ts';
import { z } from 'zod';

type LicenseApi = InstanceType<typeof platformClient.LicenseApi>;

async function getLicenseApi() {
  const client = await getGenesysClient();
  return new platformClient.LicenseApi(client);
}

function registerLicenseGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: LicenseApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'LicenseApi',
    getLicenseApi,
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
  registerLicenseGetTool(
    server,
    'getLicenseDefinition',
    'Get License Definition',
    'Get PureCloud license definition.',
    ['license', 'license:readonly'],
    ['authorization:grant:add', 'authorization:license:view'],
    z.object({ licenseId: z.string().describe('License definition ID.') }),
    async (api, { licenseId }) => ({
      entity: await api.getLicenseDefinition(licenseId),
    }),
  );

  registerLicenseGetTool(
    server,
    'getLicenseDefinitions',
    'Get License Definitions',
    'Get all PureCloud license definitions available for the organization.',
    ['license', 'license:readonly'],
    ['authorization:grant:add', 'authorization:license:view'],
    z.object({}),
    async (api) => ({
      entities: await api.getLicenseDefinitions(),
    }),
  );

  registerLicenseGetTool(
    server,
    'getLicenseToggle',
    'Get License Toggle',
    "Deprecated - no alternative required. This operation will always return 'true' for requested toggles.",
    ['license', 'license:readonly'],
    [],
    z.object({ featureName: z.string().describe('Feature name.') }),
    async (api, { featureName }) => ({
      entity: await api.getLicenseToggle(featureName),
    }),
  );

  registerLicenseGetTool(
    server,
    'getLicenseUser',
    'Get User Licenses',
    'Get licenses for specified user.',
    ['license', 'license:readonly'],
    ['authorization:grant:add', 'authorization:license:view'],
    z.object({ userId: z.uuid().describe('User ID returned from the get-users tool.') }),
    async (api, { userId }) => ({
      entity: await api.getLicenseUser(userId),
    }),
  );

  registerLicenseGetTool(
    server,
    'getLicenseUsers',
    'Get Users and Their Licenses',
    'Retrieve a page of users in an organization along with the licenses they possess. Retrieves all pages.',
    ['license', 'license:readonly'],
    [],
    z.object({}),
    async (api) => ({
      entities: await getPagedResponse((params) => api.getLicenseUsers(params), {
        pageSize: 100,
        pageNumber: 1,
      }),
    }),
  );
}

export { registerFunctions as gcLicenseRegisterFunctions };
