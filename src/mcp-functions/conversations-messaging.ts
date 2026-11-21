import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getPagedResponse, option } from './genesys-common.ts';
import { z } from 'zod';
import { registerConversationsGetTool, type ConversationsApi } from './conversations.ts';

// The messaging integrations sub-resource of ConversationsApi (Facebook/Instagram/X/WhatsApp/Apple/
// Open messaging channel integrations, identity resolution, supported content, settings). Split out
// of conversations.ts because ConversationsApi has ~115 GET methods total - by far the largest
// domain implemented so far - and this sub-resource alone accounts for about a third of them.

const messagingScopes = ['messaging', 'messaging:readonly'];
const conversationScopes = ['conversations', 'conversations:readonly'];

const messagingIntegrationExpandValues = [
  'supportedContent',
  'messagingSetting',
  'identityresolution',
] as const;

// `call` binds the concrete SDK method per call site instead of indexing `api` by a method-name
// union: the six channel-specific list/by-id/identity-resolution methods return structurally
// different entity types, and TypeScript cannot narrow a union-keyed `api[methodName]` call back to
// a single concrete overload. Passing the bound method lets each registration infer its own `T`.
function registerMessagingIntegrationListTool<T>(
  server: McpServer,
  methodName: string,
  title: string,
  channel: string,
  call: (
    api: ConversationsApi,
    params: {
      pageSize?: number;
      pageNumber?: number;
      expand?: string;
      supportedContentId?: string;
      messagingSettingId?: string;
    },
  ) => Promise<{ entities?: T[] }>,
) {
  registerConversationsGetTool(
    server,
    methodName,
    title,
    `Get a list of ${channel} Integrations. Retrieves all pages.`,
    messagingScopes,
    ['messaging:integration:view'],
    z.object({
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
      expand: z
        .enum(messagingIntegrationExpandValues)
        .optional()
        .describe('Expand instructions for the return value.'),
      supportedContentId: z
        .string()
        .optional()
        .describe('Filter integrations returned based on the supported content ID.'),
      messagingSettingId: z
        .string()
        .optional()
        .describe('Filter integrations returned based on the setting ID.'),
    }),
    async (api, { pageSize, pageNumber, expand, supportedContentId, messagingSettingId }) => {
      const filters = {
        ...option('expand', expand),
        ...option('supportedContentId', supportedContentId),
        ...option('messagingSettingId', messagingSettingId),
      };
      return {
        entities: await getPagedResponse((params) => call(api, { ...filters, ...params }), {
          ...filters,
          pageSize: pageSize ?? 25,
          pageNumber: pageNumber ?? 1,
        }),
      };
    },
  );
}

function registerMessagingIntegrationByIdTool<T>(
  server: McpServer,
  methodName: string,
  title: string,
  channel: string,
  call: (api: ConversationsApi, integrationId: string, opts: { expand?: string }) => Promise<T>,
) {
  registerConversationsGetTool(
    server,
    methodName,
    title,
    `Get a ${channel} messaging integration.`,
    messagingScopes,
    ['messaging:integration:view'],
    z.object({
      integrationId: z.uuid().describe('Integration ID.'),
      expand: z
        .enum(messagingIntegrationExpandValues)
        .optional()
        .describe('Expand instructions for the return value.'),
    }),
    async (api, { integrationId, expand }) => ({
      entity: await call(api, integrationId, option('expand', expand)),
    }),
  );
}

function registerMessagingIdentityResolutionTool<T>(
  server: McpServer,
  methodName: string,
  title: string,
  channel: string,
  permission: string,
  call: (api: ConversationsApi, integrationId: string) => Promise<T>,
) {
  registerConversationsGetTool(
    server,
    methodName,
    title,
    `Get ${channel} messaging integration identity resolution settings.`,
    messagingScopes,
    ['messaging:integration:view', permission],
    z.object({ integrationId: z.uuid().describe('Integration ID.') }),
    async (api, { integrationId }) => ({ entity: await call(api, integrationId) }),
  );
}

function registerFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversationsMessagingFacebookApp',
    'Get Facebook App ID',
    'Get Genesys Facebook App Id.',
    messagingScopes,
    ['messaging:integration:add'],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsMessagingFacebookApp() }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingFacebookPermissions',
    'Get Facebook Permissions',
    'Get a list of Facebook Permissions.',
    messagingScopes,
    [
      'messaging:integration:add',
      'messaging:integration:edit',
      'messaging:conversationInstagramIntegration:add',
    ],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsMessagingFacebookPermissions();
      return { entities: response.entities ?? [] };
    },
  );

  registerMessagingIdentityResolutionTool(
    server,
    'getConversationsMessagingIdentityresolutionIntegrationsAppleIntegrationId',
    'Get Apple Identity Resolution Settings',
    'Apple',
    'messaging:identityResolutionApple:view',
    (api, integrationId) =>
      api.getConversationsMessagingIdentityresolutionIntegrationsAppleIntegrationId(integrationId),
  );
  registerMessagingIdentityResolutionTool(
    server,
    'getConversationsMessagingIdentityresolutionIntegrationsFacebookIntegrationId',
    'Get Facebook Identity Resolution Settings',
    'Facebook',
    'messaging:identityResolutionFacebook:view',
    (api, integrationId) =>
      api.getConversationsMessagingIdentityresolutionIntegrationsFacebookIntegrationId(
        integrationId,
      ),
  );
  registerMessagingIdentityResolutionTool(
    server,
    'getConversationsMessagingIdentityresolutionIntegrationsInstagramIntegrationId',
    'Get Instagram Identity Resolution Settings',
    'Instagram',
    'messaging:identityResolutionInstagram:view',
    (api, integrationId) =>
      api.getConversationsMessagingIdentityresolutionIntegrationsInstagramIntegrationId(
        integrationId,
      ),
  );
  registerMessagingIdentityResolutionTool(
    server,
    'getConversationsMessagingIdentityresolutionIntegrationsOpenIntegrationId',
    'Get Open Messaging Identity Resolution Settings',
    'Open',
    'messaging:identityResolutionOpen:view',
    (api, integrationId) =>
      api.getConversationsMessagingIdentityresolutionIntegrationsOpenIntegrationId(integrationId),
  );
  registerMessagingIdentityResolutionTool(
    server,
    'getConversationsMessagingIdentityresolutionIntegrationsTwitterIntegrationId',
    'Get X (Twitter) Identity Resolution Settings',
    'X (Formally Twitter)',
    'messaging:identityResolutionX:view',
    (api, integrationId) =>
      api.getConversationsMessagingIdentityresolutionIntegrationsTwitterIntegrationId(
        integrationId,
      ),
  );
  registerMessagingIdentityResolutionTool(
    server,
    'getConversationsMessagingIdentityresolutionIntegrationsWhatsappIntegrationId',
    'Get WhatsApp Identity Resolution Settings',
    'WhatsApp',
    'messaging:identityResolutionWhatsApp:view',
    (api, integrationId) =>
      api.getConversationsMessagingIdentityresolutionIntegrationsWhatsappIntegrationId(
        integrationId,
      ),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrationTwitterOauthSettings',
    'Get Integration Twitter OAuth Settings',
    'Get twitter oauth settings to patch an integration.',
    messagingScopes,
    ['messaging:XIntegration:add'],
    z.object({
      integrationId: z
        .uuid()
        .describe(
          'Integration ID of an existing integration that needs to be patched with new oauth settings.',
        ),
    }),
    async (api, { integrationId }) => ({
      entity: await api.getConversationsMessagingIntegrationTwitterOauthSettings(integrationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrations',
    'Get Messaging Integrations',
    'Get a list of Integrations. Retrieves all pages.',
    messagingScopes,
    ['messaging:integration:view'],
    z.object({
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
      expand: z
        .array(z.enum(messagingIntegrationExpandValues))
        .optional()
        .describe('Expand instructions for the return value.'),
      supportedContentId: z
        .string()
        .optional()
        .describe('Filter integrations returned based on the supported content ID.'),
      messagingSettingId: z
        .string()
        .optional()
        .describe('Filter integrations returned based on the setting ID.'),
    }),
    async (api, { pageSize, pageNumber, expand, supportedContentId, messagingSettingId }) => {
      const filters = {
        ...option('expand', expand),
        ...option('supportedContentId', supportedContentId),
        ...option('messagingSettingId', messagingSettingId),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getConversationsMessagingIntegrations(params),
          {
            ...filters,
            pageSize: pageSize ?? 25,
            pageNumber: pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerMessagingIntegrationListTool(
    server,
    'getConversationsMessagingIntegrationsApple',
    'Get Apple Integrations',
    'Apple',
    (api, params) => api.getConversationsMessagingIntegrationsApple(params),
  );
  registerMessagingIntegrationByIdTool(
    server,
    'getConversationsMessagingIntegrationsAppleIntegrationId',
    'Get Apple Integration',
    'Apple',
    (api, integrationId, opts) =>
      api.getConversationsMessagingIntegrationsAppleIntegrationId(integrationId, opts),
  );

  registerMessagingIntegrationListTool(
    server,
    'getConversationsMessagingIntegrationsFacebook',
    'Get Facebook Integrations',
    'Facebook',
    (api, params) => api.getConversationsMessagingIntegrationsFacebook(params),
  );
  registerMessagingIntegrationByIdTool(
    server,
    'getConversationsMessagingIntegrationsFacebookIntegrationId',
    'Get Facebook Integration',
    'Facebook',
    (api, integrationId, opts) =>
      api.getConversationsMessagingIntegrationsFacebookIntegrationId(integrationId, opts),
  );

  registerMessagingIntegrationListTool(
    server,
    'getConversationsMessagingIntegrationsInstagram',
    'Get Instagram Integrations',
    'Instagram',
    (api, params) => api.getConversationsMessagingIntegrationsInstagram(params),
  );
  registerMessagingIntegrationByIdTool(
    server,
    'getConversationsMessagingIntegrationsInstagramIntegrationId',
    'Get Instagram Integration',
    'Instagram',
    (api, integrationId, opts) =>
      api.getConversationsMessagingIntegrationsInstagramIntegrationId(integrationId, opts),
  );

  registerMessagingIntegrationListTool(
    server,
    'getConversationsMessagingIntegrationsOpen',
    'Get Open Messaging Integrations',
    'Open messaging',
    (api, params) => api.getConversationsMessagingIntegrationsOpen(params),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileIntegrationId',
    'Get Google Business Profile Integration',
    'Get a Google Business Profile open messaging integration. Not documented in the public ' +
      'Genesys Cloud API schema; implemented directly from the installed SDK. Scopes and ' +
      'permissions are inferred from the sibling Open messaging integration endpoints, not ' +
      'confirmed by Swagger.',
    messagingScopes,
    ['messaging:integration:view'],
    z.object({
      integrationId: z.uuid().describe('Integration ID.'),
      expand: z
        .enum(messagingIntegrationExpandValues)
        .optional()
        .describe('Expand instructions for the return value.'),
    }),
    async (api, { integrationId, expand }) => ({
      entity:
        await api.getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileIntegrationId(
          integrationId,
          option('expand', expand),
        ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileOauthSettings',
    'Get Google Business Profile OAuth Settings',
    'Get the Google Business Profile OAuth settings used to authorize new integrations. Not ' +
      'documented in the public Genesys Cloud API schema; implemented directly from the installed ' +
      'SDK. Scopes and permissions are inferred from the sibling Open messaging integration ' +
      'endpoints, not confirmed by Swagger.',
    messagingScopes,
    ['messaging:integration:view'],
    z.object({}),
    async (api) => ({
      entity:
        await api.getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileOauthSettings(),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileToken',
    'Get Google Business Profile Auth Token',
    'Get a Google Business Profile authentication token by ID. Not documented in the public ' +
      'Genesys Cloud API schema; implemented directly from the installed SDK. Scopes and ' +
      'permissions are inferred from the sibling Open messaging integration endpoints, not ' +
      'confirmed by Swagger.',
    messagingScopes,
    ['messaging:integration:view'],
    z.object({ tokenId: z.uuid().describe('Google auth token ID.') }),
    async (api, { tokenId }) => ({
      entity:
        await api.getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileToken(
          tokenId,
        ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileTokenAccounts',
    'Get Google Business Profile Token Accounts',
    'Get the Google Business Profile accounts available for a given authentication token. Not ' +
      'documented in the public Genesys Cloud API schema; implemented directly from the installed ' +
      'SDK. Scopes and permissions are inferred from the sibling Open messaging integration ' +
      'endpoints, not confirmed by Swagger.',
    messagingScopes,
    ['messaging:integration:view'],
    z.object({ tokenId: z.uuid().describe('Google auth token ID.') }),
    async (api, { tokenId }) => {
      const response =
        await api.getConversationsMessagingIntegrationsOpenExtensionsGooglebusinessprofileTokenAccounts(
          tokenId,
        );
      return { entities: response.entities ?? [] };
    },
  );

  registerMessagingIntegrationByIdTool(
    server,
    'getConversationsMessagingIntegrationsOpenIntegrationId',
    'Get Open Messaging Integration',
    'Open messaging',
    (api, integrationId, opts) =>
      api.getConversationsMessagingIntegrationsOpenIntegrationId(integrationId, opts),
  );

  registerMessagingIntegrationListTool(
    server,
    'getConversationsMessagingIntegrationsTwitter',
    'Get X (Twitter) Integrations',
    'X (Formally Twitter)',
    (api, params) => api.getConversationsMessagingIntegrationsTwitter(params),
  );
  registerMessagingIntegrationByIdTool(
    server,
    'getConversationsMessagingIntegrationsTwitterIntegrationId',
    'Get X (Twitter) Integration',
    'X (Formally Twitter)',
    (api, integrationId, opts) =>
      api.getConversationsMessagingIntegrationsTwitterIntegrationId(integrationId, opts),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingIntegrationsTwitterOauthSettings',
    'Get X (Twitter) Integrations OAuth Settings',
    'Get twitter oauth settings.',
    messagingScopes,
    ['messaging:XIntegration:add'],
    z.object({}),
    async (api) => ({
      entity: await api.getConversationsMessagingIntegrationsTwitterOauthSettings(),
    }),
  );

  registerMessagingIntegrationListTool(
    server,
    'getConversationsMessagingIntegrationsWhatsapp',
    'Get WhatsApp Integrations',
    'WhatsApp',
    (api, params) => api.getConversationsMessagingIntegrationsWhatsapp(params),
  );
  registerMessagingIntegrationByIdTool(
    server,
    'getConversationsMessagingIntegrationsWhatsappIntegrationId',
    'Get WhatsApp Integration',
    'WhatsApp',
    (api, integrationId, opts) =>
      api.getConversationsMessagingIntegrationsWhatsappIntegrationId(integrationId, opts),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingOauthAppleCallback',
    'Get Apple Messaging OAuth Callback',
    'Call Authentication provider callback to validate state and code.',
    [],
    [],
    z.object({
      code: z
        .string()
        .describe(
          'The authorization code to be sent to the authentication server during the token request.',
        ),
      state: z.string().describe('The state/nonce value generated by Genesys Auth-Client Service.'),
      error: z.string().optional().describe('Error parameter from OAuth provider.'),
    }),
    async (api, { code, state, error }) => ({
      entity: await api.getConversationsMessagingOauthAppleCallback(
        code,
        state,
        option('error', error),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingSetting',
    'Get Messaging Setting',
    'Get a messaging setting.',
    messagingScopes,
    ['messaging:setting:view'],
    z.object({ messageSettingId: z.uuid().describe('Message Setting ID.') }),
    async (api, { messageSettingId }) => ({
      entity: await api.getConversationsMessagingSetting(messageSettingId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingSettings',
    'Get Messaging Settings',
    'Get a list of messaging settings. Retrieves all pages.',
    messagingScopes,
    ['messaging:setting:view'],
    z.object({
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
    }),
    async (api, { pageSize, pageNumber }) => ({
      entities: await getPagedResponse((params) => api.getConversationsMessagingSettings(params), {
        pageSize: pageSize ?? 25,
        pageNumber: pageNumber ?? 1,
      }),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingSettingsDefault',
    'Get Default Messaging Setting',
    "Get the organization's default settings that will be used as the default when creating an " +
      'integration.',
    messagingScopes,
    ['messaging:setting:view'],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsMessagingSettingsDefault() }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingSupportedcontent',
    'Get Supported Content Profiles',
    'Get a list of Supported Content profiles. Retrieves all pages.',
    messagingScopes,
    ['messaging:supportedContent:view'],
    z.object({
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
    }),
    async (api, { pageSize, pageNumber }) => ({
      entities: await getPagedResponse(
        (params) => api.getConversationsMessagingSupportedcontent(params),
        {
          pageSize: pageSize ?? 25,
          pageNumber: pageNumber ?? 1,
        },
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingSupportedcontentDefault',
    'Get Default Supported Content Profile',
    "Get the organization's default supported content profile that will be used as the default " +
      'when creating an integration.',
    messagingScopes,
    ['messaging:supportedContent:view'],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsMessagingSupportedcontentDefault() }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingSupportedcontentSupportedContentId',
    'Get Supported Content Profile',
    'Get a supported content profile.',
    messagingScopes,
    ['messaging:supportedContent:view'],
    z.object({ supportedContentId: z.uuid().describe('Supported Content ID.') }),
    async (api, { supportedContentId }) => ({
      entity:
        await api.getConversationsMessagingSupportedcontentSupportedContentId(supportedContentId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagingThreadingtimeline',
    'Get Messaging Threading Timeline',
    'Get conversation threading window timeline for each messaging type. This setting dictates ' +
      'whether a new message is added to the most recent existing conversation or creates a new ' +
      'one once the previous conversation is disconnected and the threading timeline expires.',
    conversationScopes,
    ['conversation:threadingTimeline:view'],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsMessagingThreadingtimeline() }),
  );
}

export { registerFunctions as gcConversationsMessagingRegisterFunctions };
