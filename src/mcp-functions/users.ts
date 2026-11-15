import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getGenesysClient } from '../genesys.ts';
import platformClient from 'purecloud-platform-client-v2';
import { getPagedResponse } from './genesys-common.ts';
import { z } from 'zod';

async function getUsersApi() {
  const client = await getGenesysClient();
  return new platformClient.UsersApi(client);
}

function createExpandParamSchema() {
  return z
    .array(z.string())
    .optional()
    .describe(
      'Which fields, if any, to expand. Note, expand parameters are resolved with a best effort approach and not guaranteed to be returned. If requested expand information is absolutely required, it is recommended to use specific API requests instead. Valid values: routingStatus, presence, integrationPresence, conversationSummary, outOfOffice, geolocation, station, authorization, lasttokenissued, authorization.unusedRoles, team, workPlanBidRanks, externalContactsSettings, groups, customAttributes, profileSkills, certifications, locations, skills, languages, languagePreference, employerInfo, biography, dateLastLogin, dateWelcomeSent',
    );
}

function registerFunctions(server: McpServer) {
  server.registerTool(
    'get-users',
    {
      title: 'Get Users',
      description: 'Return Genesys Cloud users as structured JSON.',
      inputSchema: z.object({
        expand: createExpandParamSchema(),
      }),
    },
    async ({ expand }) => {
      try {
        const usersApi = await getUsersApi();
        const users = await getPagedResponse((params) => usersApi.getUsers(params), {
          expand: expand ?? [],
          pageSize: 100,
          pageNumber: 1,
        });
        return {
          content: [],
          structuredContent: { entities: users },
        };
      } catch {
        const message = 'Failed to retrieve Genesys Cloud users.';
        console.error(message);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );

  server.registerTool(
    'get-user-by-id',
    {
      title: 'Get User by ID',
      description: 'Return a Genesys Cloud user by ID as structured JSON.',
      inputSchema: z.object({
        userId: z
          .uuid()
          .describe('The ID of the user to retrieve, returned from the get-users tool'),
        expand: createExpandParamSchema(),
      }),
    },
    async ({ userId, expand }) => {
      try {
        const usersApi = await getUsersApi();
        const user = await usersApi.getUser(userId, { expand: expand ?? [] });
        return {
          content: [],
          structuredContent: { entity: user },
        };
      } catch {
        const message = 'Failed to retrieve Genesys Cloud user.';
        console.error(message);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );

  server.registerTool(
    'get-user-me',
    {
      title: 'Get Current User',
      description: 'Return the currently authenticated Genesys Cloud user as structured JSON.',
      inputSchema: {},
    },
    async ({}) => {
      try {
        const usersApi = await getUsersApi();
        const user = await usersApi.getUsersMe();
        return {
          content: [],
          structuredContent: { entity: user },
        };
      } catch {
        const message = 'Failed to retrieve current Genesys Cloud user.';
        console.error(message);
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );
}

export { registerFunctions as gcUsersRegisterFunctions };
