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
import { gcConversationsMessagingRegisterFunctions } from './conversations-messaging.ts';

// Exported so the sibling conversations-messaging.ts module (the "messaging" sub-resource of this
// domain, split out because ConversationsApi has ~115 GET methods - far more than any other domain
// implemented so far) can reuse the same thin registration wrapper and API type.
export type ConversationsApi = InstanceType<typeof platformClient.ConversationsApi>;

export async function getConversationsApi() {
  const client = await getGenesysClient();
  return new platformClient.ConversationsApi(client);
}

export function registerConversationsGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: ConversationsApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'ConversationsApi',
    getConversationsApi,
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

const conversationScopes = ['conversations', 'conversations:readonly'];
const analyticsScopes = ['analytics', 'analytics:readonly'];

const callsHistoryExpandValues = [
  'externalorganization',
  'externalcontact',
  'user',
  'queue',
  'group',
] as const;

const suggestionTypeValues = [
  'Faq',
  'Article',
  'KnowledgeArticle',
  'KnowledgeSearch',
  'CannedResponse',
  'Script',
  'SuggestedKnowledgeAnswer',
  'ThirdPartySuggestion',
] as const;

const suggestionStateValues = ['Suggested', 'Accepted', 'Dismissed', 'Failed', 'Rated'] as const;

function registerAnalyticsFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getAnalyticsConversationDetails',
    'Get Analytics Conversation Details',
    'Get a conversation by id.',
    analyticsScopes,
    ['analytics:conversationDetail:view', 'analytics:agentConversationDetail:view'],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getAnalyticsConversationDetails(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getAnalyticsConversationsAggregatesJob',
    'Get Conversation Aggregates Job Status',
    'Get status for async query for conversation aggregates.',
    analyticsScopes,
    ['analytics:conversationAggregate:view'],
    z.object({ jobId: z.string().describe('Job ID.') }),
    async (api, { jobId }) => ({
      entity: await api.getAnalyticsConversationsAggregatesJob(jobId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getAnalyticsConversationsAggregatesJobResults',
    'Get Conversation Aggregates Job Results',
    'Fetch a page of results for an async aggregates query.',
    analyticsScopes,
    ['analytics:conversationAggregate:view'],
    z.object({
      jobId: z.string().describe('Job ID.'),
      cursor: z.string().optional().describe('Cursor token to retrieve next page.'),
    }),
    async (api, { jobId, cursor }) => ({
      entity: await api.getAnalyticsConversationsAggregatesJobResults(
        jobId,
        option('cursor', cursor),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getAnalyticsConversationsDetails',
    'Get Multiple Analytics Conversation Details',
    'Gets multiple conversations by id.',
    analyticsScopes,
    ['analytics:conversationDetail:view', 'analytics:agentConversationDetail:view'],
    z.object({
      id: z.array(z.uuid()).optional().describe('Conversation IDs to fetch.'),
    }),
    async (api, { id }) => {
      const response = await api.getAnalyticsConversationsDetails(option('id', id));
      return { conversations: response.conversations ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getAnalyticsConversationsDetailsJob',
    'Get Conversation Details Job Status',
    'Get status for async query for conversation details.',
    analyticsScopes,
    ['analytics:conversationDetail:view', 'analytics:agentConversationDetail:view'],
    z.object({ jobId: z.string().describe('Job ID.') }),
    async (api, { jobId }) => ({
      entity: await api.getAnalyticsConversationsDetailsJob(jobId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getAnalyticsConversationsDetailsJobResults',
    'Get Conversation Details Job Results',
    'Fetch a page of results for an async details job.',
    analyticsScopes,
    ['analytics:conversationDetail:view', 'analytics:agentConversationDetail:view'],
    z.object({
      jobId: z.string().describe('Job ID.'),
      cursor: z
        .string()
        .optional()
        .describe('Indicates where to resume query results (not required for first page).'),
      pageSize: z.number().int().optional().describe('The desired maximum number of results.'),
    }),
    async (api, { jobId, cursor, pageSize }) => ({
      entity: await api.getAnalyticsConversationsDetailsJobResults(jobId, {
        ...option('cursor', cursor),
        ...option('pageSize', pageSize),
      }),
    }),
  );

  registerConversationsGetTool(
    server,
    'getAnalyticsConversationsDetailsJobsAvailability',
    'Get Conversation Details Data Availability',
    'Lookup the datalake availability date and time.',
    analyticsScopes,
    ['analytics:conversationDetail:view'],
    z.object({}),
    async (api) => ({
      entity: await api.getAnalyticsConversationsDetailsJobsAvailability(),
    }),
  );
}

function registerConversationCoreFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversation',
    'Get Conversation',
    'Get conversation.',
    conversationScopes,
    ['conversation:communication:view'],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({ entity: await api.getConversation(conversationId) }),
  );

  registerConversationsGetTool(
    server,
    'getConversationAccessattributes',
    'Get Conversation Access Attributes',
    'Get the access attributes on a conversation. Not documented in the public Genesys Cloud API ' +
      'schema; implemented directly from the installed SDK. Scopes are inferred from the other ' +
      'conversation endpoints, not confirmed by Swagger.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationAccessattributes(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationAssistantCopilotcontext',
    'Get Conversation Copilot Context',
    'Get the Copilot context values for a conversation. Not documented in the public Genesys ' +
      'Cloud API schema; implemented directly from the installed SDK. Scopes are inferred from the ' +
      'other conversation endpoints, not confirmed by Swagger.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationAssistantCopilotcontext(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationCommunicationAgentchecklist',
    'Get Conversation Agent Checklist',
    'Get checklist info for a single checklist.',
    conversationScopes,
    ['conversation:agentchecklist:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      agentChecklistId: z.uuid().describe('Agent Checklist ID.'),
    }),
    async (api, { conversationId, communicationId, agentChecklistId }) => ({
      entity: await api.getConversationCommunicationAgentchecklist(
        conversationId,
        communicationId,
        agentChecklistId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationCommunicationAgentchecklistJob',
    'Get Conversation Agent Checklist Inference Job',
    'Get inference job status.',
    conversationScopes,
    ['conversation:agentchecklist:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      agentChecklistId: z.uuid().describe('Agent Checklist ID.'),
      jobId: z.string().describe('Inference Job ID.'),
    }),
    async (api, { conversationId, communicationId, agentChecklistId, jobId }) => ({
      entity: await api.getConversationCommunicationAgentchecklistJob(
        conversationId,
        communicationId,
        agentChecklistId,
        jobId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationCommunicationAgentchecklists',
    'Get Conversation Agent Checklists',
    'Get information of all checklists associated with a conversation.',
    conversationScopes,
    ['conversation:agentchecklist:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
    }),
    async (api, { conversationId, communicationId }) => {
      const response = await api.getConversationCommunicationAgentchecklists(
        conversationId,
        communicationId,
      );
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationCommunicationInternalmessage',
    'Get Conversation Internal Message',
    'Get message.',
    conversationScopes,
    ['conversation:internalMessaging:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      messageId: z.uuid().describe('Message ID.'),
    }),
    async (api, { conversationId, communicationId, messageId }) => ({
      entity: await api.getConversationCommunicationInternalmessage(
        conversationId,
        communicationId,
        messageId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationCommunicationInternalmessages',
    'Get Conversation Internal Messages',
    'Get messages for communication. Retrieves all pages.',
    conversationScopes,
    ['conversation:internalMessaging:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25, maximum 200.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
    }),
    async (api, { conversationId, communicationId, pageSize, pageNumber }) => ({
      entities: await getPagedResponse(
        (params) =>
          api.getConversationCommunicationInternalmessages(conversationId, communicationId, params),
        {
          pageSize: pageSize ?? 25,
          pageNumber: pageNumber ?? 1,
        },
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationCustomattribute',
    'Get Conversation Custom Attribute',
    'Get custom attributes by id.',
    conversationScopes,
    ['conversation:customAttributes:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      attributesId: z.uuid().describe('Custom attributes ID.'),
    }),
    async (api, { conversationId, attributesId }) => ({
      entity: await api.getConversationCustomattribute(conversationId, attributesId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationCustomattributes',
    'Get Conversation Custom Attributes',
    'Get a list of custom attributes for a conversation.',
    conversationScopes,
    ['conversation:customAttributes:view'],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => {
      const response = await api.getConversationCustomattributes(conversationId);
      return { results: response.results ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationParticipantSecureivrsession',
    'Get Conversation Participant Secure IVR Session',
    'Fetch info on a secure session.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      secureSessionId: z.uuid().describe('Secure IVR session ID.'),
    }),
    async (api, { conversationId, participantId, secureSessionId }) => ({
      entity: await api.getConversationParticipantSecureivrsession(
        conversationId,
        participantId,
        secureSessionId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationParticipantSecureivrsessions',
    'Get Conversation Participant Secure IVR Sessions',
    'Get a list of secure sessions for this participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => {
      const response = await api.getConversationParticipantSecureivrsessions(
        conversationId,
        participantId,
      );
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationParticipantWrapup',
    'Get Conversation Participant Wrap-up',
    'Get the wrap-up for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates if the wrap-up code is provisional. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, provisional }) => ({
      entity: await api.getConversationParticipantWrapup(
        conversationId,
        participantId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationParticipantWrapupcodes',
    'Get Conversation Participant Wrap-up Codes',
    'Get list of wrapup codes for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => ({
      entities: await api.getConversationParticipantWrapupcodes(conversationId, participantId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationSecureattributes',
    'Get Conversation Secure Attributes',
    'Get the secure attributes on a conversation.',
    conversationScopes,
    ['conversation:participant:attributesview'],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationSecureattributes(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationSuggestion',
    'Get Conversation Suggestion',
    'Get Suggestion.',
    conversationScopes,
    ['conversation:suggestion:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      suggestionId: z.uuid().describe('Suggestion ID.'),
    }),
    async (api, { conversationId, suggestionId }) => ({
      entity: await api.getConversationSuggestion(conversationId, suggestionId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationSuggestions',
    'Get Conversation Suggestions',
    'Get all suggestions for a conversation. Use the "before" and "after" params to fetch the ' +
      'next/previous page using the cursor returned in nextUri/previousUri; this tool returns a ' +
      'single page.',
    conversationScopes,
    ['conversation:suggestion:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
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
      pageSize: z.string().optional().describe('Number of entities to return. Maximum of 200.'),
      type: z.enum(suggestionTypeValues).optional().describe('Suggestion type to filter by.'),
      state: z
        .enum(suggestionStateValues)
        .optional()
        .describe('Suggestion state to filter Copilot suggestions by.'),
    }),
    async (api, { conversationId, before, after, pageSize, type, state }) => {
      const response = await api.getConversationSuggestions(conversationId, {
        ...option('before', before),
        ...option('after', after),
        ...option('pageSize', pageSize),
        ...option('type', type),
        ...option('state', state),
      });
      return {
        entities: response.entities ?? [],
        nextUri: response.nextUri,
        previousUri: response.previousUri,
        selfUri: response.selfUri,
      };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationSummaries',
    'Get Conversation Summaries',
    'Get the summaries of the conversation.',
    conversationScopes,
    ['conversation:summary:view'],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationSummaries(conversationId),
    }),
  );
}

function registerConversationsCollectionFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversations',
    'Get Active Conversations',
    'Get active conversations for the logged in user.',
    conversationScopes,
    [],
    z.object({
      communicationType: z.string().optional().describe('Call or Chat communication filtering.'),
    }),
    async (api, { communicationType }) => {
      const response = await api.getConversations(option('communicationType', communicationType));
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCall',
    'Get Call Conversation',
    'Get call conversation.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({ entity: await api.getConversationsCall(conversationId) }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallParticipantCommunicationWrapup',
    'Get Call Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsCallParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallParticipantWrapup',
    'Get Call Participant Wrap-up',
    'Get the wrap-up for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, provisional }) => ({
      entity: await api.getConversationsCallParticipantWrapup(
        conversationId,
        participantId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallParticipantWrapupcodes',
    'Get Call Participant Wrap-up Codes',
    'Get list of wrapup codes for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => ({
      entities: await api.getConversationsCallParticipantWrapupcodes(conversationId, participantId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallback',
    'Get Callback Conversation',
    'Get callback conversation.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsCallback(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallbackParticipantCommunicationWrapup',
    'Get Callback Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsCallbackParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallbackParticipantWrapup',
    'Get Callback Participant Wrap-up',
    'Get the wrap-up for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, provisional }) => ({
      entity: await api.getConversationsCallbackParticipantWrapup(
        conversationId,
        participantId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallbackParticipantWrapupcodes',
    'Get Callback Participant Wrap-up Codes',
    'Get list of wrapup codes for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => ({
      entities: await api.getConversationsCallbackParticipantWrapupcodes(
        conversationId,
        participantId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallbacks',
    'Get Active Callback Conversations',
    "Get the logged-in user's active conversations and their Callback participants state. Answers " +
      'whether the user is involved in any active conversation, whether that conversation includes ' +
      'Callbacks, and whether the user is directly participating in a Callback within it.',
    conversationScopes,
    [],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsCallbacks();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCalls',
    'Get Active Call Conversations',
    "Get the logged-in user's active conversations and their Call participants state. Answers " +
      'whether the user is involved in any active conversation, whether that conversation includes ' +
      'Calls, and whether the user is directly participating in a Call within it.',
    conversationScopes,
    [],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsCalls();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallsHistory',
    'Get Call History',
    'Get call history. Retrieves all pages.',
    conversationScopes,
    [],
    z.object({
      pageSize: z.number().int().optional().describe('Page size, maximum 50. Defaults to 25.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
      interval: z
        .string()
        .optional()
        .describe(
          "Interval string; format is ISO-8601. Separate start and end times with forward slash '/'.",
        ),
      expand: createExpandEnumSchema(callsHistoryExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { pageSize, pageNumber, interval, expand }) => {
      const filters = {
        ...option('interval', interval),
        ...option('expand', expand),
      };
      return {
        entities: await getPagedResponse((params) => api.getConversationsCallsHistory(params), {
          ...filters,
          pageSize: pageSize ?? 25,
          pageNumber: pageNumber ?? 1,
        }),
      };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCallsMaximumconferenceparties',
    'Get Maximum Conference Parties',
    'Get the maximum number of participants that this user can have on a conference.',
    conversationScopes,
    [],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsCallsMaximumconferenceparties() }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCobrowsesession',
    'Get Cobrowse Conversation',
    'Get cobrowse conversation.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsCobrowsesession(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCobrowsesessionParticipantCommunicationWrapup',
    'Get Cobrowse Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication. Deprecated: see ' +
      'https://help.genesys.cloud/articles/deprecation-legacy-co-browse-and-screenshare/.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsCobrowsesessionParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCobrowsesessionParticipantWrapup',
    'Get Cobrowse Participant Wrap-up',
    'Get the wrap-up for this conversation participant. Deprecated: see ' +
      'https://help.genesys.cloud/articles/deprecation-legacy-co-browse-and-screenshare/.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, provisional }) => ({
      entity: await api.getConversationsCobrowsesessionParticipantWrapup(
        conversationId,
        participantId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCobrowsesessionParticipantWrapupcodes',
    'Get Cobrowse Participant Wrap-up Codes',
    'Get list of wrapup codes for this conversation participant. Deprecated: see ' +
      'https://help.genesys.cloud/articles/deprecation-legacy-co-browse-and-screenshare/.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => ({
      entities: await api.getConversationsCobrowsesessionParticipantWrapupcodes(
        conversationId,
        participantId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCobrowsesessions',
    'Get Active Cobrowse Conversations',
    'Get active cobrowse conversations for the logged in user.',
    conversationScopes,
    [],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsCobrowsesessions();
      return { entities: response.entities ?? [] };
    },
  );
}

function registerConversationsCustomAttributesSchemaFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchema',
    'Get Conversation Custom Attributes Schema',
    'Get a schema.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({ schemaId: z.uuid().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entity: await api.getConversationsCustomattributesSchema(schemaId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchemaVersion',
    'Get Conversation Custom Attributes Schema Version',
    'Get a specific version of a schema.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({
      schemaId: z.uuid().describe('Schema ID.'),
      versionId: z.string().describe('Schema version.'),
    }),
    async (api, { schemaId, versionId }) => ({
      entity: await api.getConversationsCustomattributesSchemaVersion(schemaId, versionId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchemaVersions',
    'Get Conversation Custom Attributes Schema Versions',
    'Get all versions of a CCA schema.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({ schemaId: z.uuid().describe('Schema ID.') }),
    async (api, { schemaId }) => {
      const response = await api.getConversationsCustomattributesSchemaVersions(schemaId);
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchemas',
    'Get Conversation Custom Attributes Schemas',
    'Get a list of schemas.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsCustomattributesSchemas();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchemasCoretype',
    'Get Conversation Custom Attributes Core Type',
    'Get the core types from which all schemas are built.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({ coreTypeName: z.string().describe('Name of the core type.') }),
    async (api, { coreTypeName }) => ({
      entity: await api.getConversationsCustomattributesSchemasCoretype(coreTypeName),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchemasCoretypes',
    'Get Conversation Custom Attributes Core Types',
    'Get the list of core types enabled for a specific namespace.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsCustomattributesSchemasCoretypes();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsCustomattributesSchemasLimits',
    'Get Conversation Custom Attributes Schema Limits',
    'Get quantitative limits on schemas.',
    conversationScopes,
    ['conversation:customAttributes:schemaView'],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsCustomattributesSchemasLimits() }),
  );
}

function registerConversationsEmailFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversationsEmail',
    'Get Email Conversation',
    'Get email conversation.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsEmail(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailMessage',
    'Get Email Conversation Message',
    'Get conversation message.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      messageId: z.uuid().describe('Message ID.'),
    }),
    async (api, { conversationId, messageId }) => ({
      entity: await api.getConversationsEmailMessage(conversationId, messageId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailMessages',
    'Get Email Conversation Messages',
    'Get conversation messages.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      includeAgentlessStitchedMessages: z
        .boolean()
        .optional()
        .describe(
          "Whether to include Agentless 'api' type messages on stitched conversations. Defaults " +
            'to false.',
        ),
    }),
    async (api, { conversationId, includeAgentlessStitchedMessages }) => {
      const response = await api.getConversationsEmailMessages(
        conversationId,
        option('includeAgentlessStitchedMessages', includeAgentlessStitchedMessages),
      );
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailMessagesDraft',
    'Get Email Conversation Draft Reply',
    'Get conversation draft reply.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsEmailMessagesDraft(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailParticipantCommunicationWrapup',
    'Get Email Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsEmailParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailParticipantWrapup',
    'Get Email Participant Wrap-up',
    'Get the wrap-up for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, provisional }) => ({
      entity: await api.getConversationsEmailParticipantWrapup(
        conversationId,
        participantId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailParticipantWrapupcodes',
    'Get Email Participant Wrap-up Codes',
    'Get list of wrapup codes for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => ({
      entities: await api.getConversationsEmailParticipantWrapupcodes(
        conversationId,
        participantId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmailSettings',
    'Get Email Conversation Settings',
    'Get emails settings for a given conversation.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsEmailSettings(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsEmails',
    'Get Active Email Conversations',
    "Get the logged-in user's active conversations and their Email participants state. Answers " +
      'whether the user is involved in any active conversation, whether that conversation includes ' +
      'Emails, and whether the user is directly participating in an Email within it.',
    conversationScopes,
    [],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsEmails();
      return { entities: response.entities ?? [] };
    },
  );
}

function registerConversationsMessageFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversationsInternalmessage',
    'Get Internal Message Conversation',
    'Get internal message conversation.',
    conversationScopes,
    ['conversation:internalMessaging:view'],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsInternalmessage(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsInternalmessages',
    'Get Active Internal Message Conversations',
    "Get the logged-in user's active conversations and their InternalMessage participants state. " +
      'Answers whether the user is involved in any active conversation, whether that conversation ' +
      'includes InternalMessages, and whether the user is directly participating in an ' +
      'InternalMessage within it.',
    conversationScopes,
    ['conversation:internalMessaging:view'],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsInternalmessages();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsKeyconfiguration',
    'Get Conversation Encryption Key Configuration',
    'Get the encryption key configurations.',
    conversationScopes,
    ['conversation:encryptionKey:view'],
    z.object({ keyconfigurationsId: z.uuid().describe('Key Configurations ID.') }),
    async (api, { keyconfigurationsId }) => ({
      entity: await api.getConversationsKeyconfiguration(keyconfigurationsId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsKeyconfigurations',
    'Get Conversation Encryption Key Configurations',
    'Get a list of key configurations data.',
    conversationScopes,
    ['conversation:encryptionKey:view'],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsKeyconfigurations();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessage',
    'Get Message Conversation',
    'Get message conversation.',
    conversationScopes,
    [],
    z.object({ conversationId: z.uuid().describe('Conversation ID.') }),
    async (api, { conversationId }) => ({
      entity: await api.getConversationsMessage(conversationId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageCommunicationMessagesMedia',
    'Get Message Communication Media List',
    'Get message media list by status. Retrieves all pages.',
    conversationScopes,
    ['conversation:messageMedia:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      status: z
        .enum(['uploading', 'valid', 'invalid'])
        .optional()
        .describe('The status on which to filter the response.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
    }),
    async (api, { conversationId, communicationId, status, pageNumber, pageSize }) => {
      const filters = option('status', status);
      return {
        entities: await getPagedResponse(
          (params) =>
            api.getConversationsMessageCommunicationMessagesMedia(conversationId, communicationId, {
              ...filters,
              ...params,
            }),
          {
            ...filters,
            pageNumber: pageNumber ?? 1,
            pageSize: pageSize ?? 25,
          },
        ),
      };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageCommunicationMessagesMediaMediaId',
    'Get Message Communication Media',
    'Get media. See https://developer.genesys.cloud/commdigital/digital/messagemediaupload/ for ' +
      'example usage.',
    conversationScopes,
    ['conversation:message:view', 'conversation:webmessaging:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      mediaId: z.uuid().describe('Media ID.'),
    }),
    async (api, { conversationId, communicationId, mediaId }) => ({
      entity: await api.getConversationsMessageCommunicationMessagesMediaMediaId(
        conversationId,
        communicationId,
        mediaId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageDetails',
    'Get Message Details',
    'Get message.',
    conversationScopes,
    ['conversation:message:view', 'conversation:webmessaging:view'],
    z.object({ messageId: z.uuid().describe('Message ID.') }),
    async (api, { messageId }) => ({
      entity: await api.getConversationsMessageDetails(messageId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageMessage',
    'Get Message Conversation Message',
    'Get conversation message.',
    conversationScopes,
    ['conversation:message:view', 'conversation:webmessaging:view'],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      messageId: z.uuid().describe('Message ID.'),
    }),
    async (api, { conversationId, messageId }) => ({
      entity: await api.getConversationsMessageMessage(conversationId, messageId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageParticipantCommunicationWrapup',
    'Get Message Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsMessageParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageParticipantWrapup',
    'Get Message Participant Wrap-up',
    'Get the wrap-up for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, provisional }) => ({
      entity: await api.getConversationsMessageParticipantWrapup(
        conversationId,
        participantId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessageParticipantWrapupcodes',
    'Get Message Participant Wrap-up Codes',
    'Get list of wrapup codes for this conversation participant.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
    }),
    async (api, { conversationId, participantId }) => ({
      entities: await api.getConversationsMessageParticipantWrapupcodes(
        conversationId,
        participantId,
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessages',
    'Get Active Message Conversations',
    "Get the logged-in user's active conversations and their Message participants state. Answers " +
      'whether the user is involved in any active conversation, whether that conversation includes ' +
      'Messages, and whether the user is directly participating in a Message within it.',
    conversationScopes,
    [],
    z.object({}),
    async (api) => {
      const response = await api.getConversationsMessages();
      return { entities: response.entities ?? [] };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagesCachedmedia',
    'Get Cached Media Items',
    'Get a list of cached media items. Retrieves all pages.',
    conversationScopes,
    ['conversation:cachedMedia:view'],
    z.object({
      pageSize: z.number().int().optional().describe('Page size. Defaults to 25.'),
      pageNumber: z.number().int().optional().describe('Page number. Defaults to 1.'),
      url: z.string().optional().describe('URL to search for.'),
    }),
    async (api, { pageSize, pageNumber, url }) => {
      const filters = option('url', url);
      return {
        entities: await getPagedResponse(
          (params) => api.getConversationsMessagesCachedmedia(params),
          {
            ...filters,
            pageSize: pageSize ?? 25,
            pageNumber: pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerConversationsGetTool(
    server,
    'getConversationsMessagesCachedmediaCachedMediaItemId',
    'Get Cached Media Item',
    'Get a cached media item.',
    conversationScopes,
    ['conversation:cachedMedia:view'],
    z.object({ cachedMediaItemId: z.uuid().describe('Cached media item ID.') }),
    async (api, { cachedMediaItemId }) => ({
      entity: await api.getConversationsMessagesCachedmediaCachedMediaItemId(cachedMediaItemId),
    }),
  );
}

function registerConversationsMiscFunctions(server: McpServer) {
  registerConversationsGetTool(
    server,
    'getConversationsScreenshareParticipantCommunicationWrapup',
    'Get Screenshare Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication. Deprecated: see ' +
      'https://help.genesys.cloud/articles/deprecation-legacy-co-browse-and-screenshare/.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsScreenshareParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsSettings',
    'Get Conversations Settings',
    'Get Settings.',
    conversationScopes,
    ['conversation:settings:view'],
    z.object({}),
    async (api) => ({ entity: await api.getConversationsSettings() }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsSocialParticipantCommunicationWrapup',
    'Get Social Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsSocialParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsVideoDetails',
    'Get Video Conference Details',
    'Get details of a video conference. Not documented in the public Genesys Cloud API schema; ' +
      'implemented directly from the installed SDK. Scopes are inferred from the other conversation ' +
      'video endpoints, not confirmed by Swagger.',
    conversationScopes,
    [],
    z.object({ conferenceId: z.uuid().describe('Video conference ID.') }),
    async (api, { conferenceId }) => ({
      entity: await api.getConversationsVideoDetails(conferenceId),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsVideoParticipantCommunicationWrapup',
    'Get Video Participant Communication Wrap-up',
    'Get the wrap-up for this conversation communication.',
    conversationScopes,
    [],
    z.object({
      conversationId: z.uuid().describe('Conversation ID.'),
      participantId: z.uuid().describe('Participant ID.'),
      communicationId: z.uuid().describe('Communication ID.'),
      provisional: z
        .boolean()
        .optional()
        .describe('Indicates whether or not to fetch provisional wrap-up code. Defaults to false.'),
    }),
    async (api, { conversationId, participantId, communicationId, provisional }) => ({
      entity: await api.getConversationsVideoParticipantCommunicationWrapup(
        conversationId,
        participantId,
        communicationId,
        option('provisional', provisional),
      ),
    }),
  );

  registerConversationsGetTool(
    server,
    'getConversationsVideosMeeting',
    'Get Video Meeting Record',
    'Gets a record for a given meetingId.',
    conversationScopes,
    ['video:video:access'],
    z.object({ meetingId: z.string().describe('Meeting ID.') }),
    async (api, { meetingId }) => ({
      entity: await api.getConversationsVideosMeeting(meetingId),
    }),
  );
}

function registerFunctions(server: McpServer) {
  registerAnalyticsFunctions(server);
  registerConversationCoreFunctions(server);
  registerConversationsCollectionFunctions(server);
  registerConversationsCustomAttributesSchemaFunctions(server);
  registerConversationsEmailFunctions(server);
  registerConversationsMessageFunctions(server);
  registerConversationsMiscFunctions(server);
}

export function gcConversationsRegisterFunctions(server: McpServer) {
  registerFunctions(server);
  gcConversationsMessagingRegisterFunctions(server);
}
