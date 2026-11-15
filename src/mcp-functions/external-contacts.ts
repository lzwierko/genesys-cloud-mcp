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

type ExternalContactsApi = InstanceType<typeof platformClient.ExternalContactsApi>;

// Every ExternalContactsApi GET endpoint documents the same OAuth scopes.
const externalContactsScopes = ['external-contacts', 'external-contacts:readonly'];

// Shared expand enums, reused across endpoints that document the identical set of expand values.
const contactExpandValues = [
  'externalOrganization',
  'externalDataSources',
  'identifiers',
  'externalSources',
  'division',
] as const;

const contactUnresolvedExpandValues = [
  'externalOrganization',
  'externalDataSources',
  'identifiers',
  'division',
] as const;

const noteExpandValues = ['author', 'externalDataSources', 'division'] as const;

const contactNotesExpandValues = [...noteExpandValues, 'mergeset'] as const;

const organizationExpandValues = [
  'externalDataSources',
  'division',
  'identifiers',
  'externalSources',
] as const;

const relationshipExpandValues = ['externalDataSources', 'division'] as const;

const reverseWhitepagesExpandValues = [
  'contacts.externalOrganization',
  'externalDataSources',
  'division',
] as const;

const clusterScanExpandValues = ['statistics.aggregated'] as const;

const clusterScanLatestExpandValues = ['statistics.aggregated', 'settings'] as const;

const importExpandValues = ['division'] as const;

const mergeInfoStatusValues = [
  'AutoQueued',
  'AutoSucceeded',
  'AutoFailed',
  'ManualQueued',
  'ManualSucceeded',
  'ManualFailed',
  'NotMerged',
] as const;

const jobStatusValues = ['Created', 'Running', 'Completed', 'Failed', 'Cancelled'] as const;

const directionSortOrderValues = ['Ascending', 'Descending'] as const;

async function getExternalContactsApi() {
  const client = await getGenesysClient();
  return new platformClient.ExternalContactsApi(client);
}

function registerExternalContactsGetTool<S extends z.ZodType>(
  server: McpServer,
  methodName: string,
  title: string,
  summary: string,
  permissions: string[],
  inputSchema: S,
  execute: (api: ExternalContactsApi, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName?: string,
) {
  registerApiGetTool(
    server,
    'ExternalContactsApi',
    getExternalContactsApi,
    methodName,
    title,
    summary,
    externalContactsScopes,
    permissions,
    inputSchema,
    execute,
    toolName,
  );
}

function registerFunctions(server: McpServer) {
  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContact',
    'Get External Contact',
    'Fetch an external contact.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      contactId: z.uuid().describe('ExternalContact ID.'),
      expand: createExpandEnumSchema(contactExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { contactId, expand }) => ({
      entity: await api.getExternalcontactsContact(contactId, option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactIdentifiers',
    'Get External Contact Identifiers',
    'List the identifiers for a contact.',
    ['externalContacts:contact:view'],
    z.object({ contactId: z.uuid().describe('ExternalContact ID.') }),
    async (api, { contactId }) => ({
      entities: (await api.getExternalcontactsContactIdentifiers(contactId)).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactJourneySegments',
    'Get External Contact Journey Segments',
    'Retrieve segment assignments by external contact ID. The public API also documents an ' +
      '"expand" (segment) and a "segmentIds" filter for this endpoint, but the installed SDK only ' +
      'exposes includeMerged and limit for it; those two filters are therefore not available here.',
    ['externalContacts:segmentAssignment:view'],
    z.object({
      contactId: z.uuid().describe('ExternalContact ID.'),
      includeMerged: z
        .boolean()
        .optional()
        .describe(
          'Whether to return segment assignments from all external contacts in the merge-set of the given one.',
        ),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Number of entities to return. Default of 25, maximum of 500.'),
    }),
    async (api, { contactId, includeMerged, limit }) => ({
      entities:
        (
          await api.getExternalcontactsContactJourneySegments(contactId, {
            ...option('includeMerged', includeMerged),
            ...option('limit', limit),
          })
        ).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactJourneySessions',
    'Get External Contact Journey Sessions',
    'Retrieve all sessions for a given external contact. Returns a single page; use the response ' +
      'nextUri (or pass the returned cursor back as "after") for additional pages.',
    ['externalContacts:session:view'],
    z.object({
      contactId: z.uuid().describe('ExternalContact ID.'),
      pageSize: z.string().optional().describe('Number of entities to return. Maximum of 200.'),
      after: z
        .string()
        .optional()
        .describe(
          'The cursor that points to the end of the set of entities that has been returned.',
        ),
      includeMerged: z
        .boolean()
        .optional()
        .describe(
          'Whether to return sessions from all external contacts in the merge-set of the given one.',
        ),
    }),
    async (api, { contactId, pageSize, after, includeMerged }) => ({
      entity: await api.getExternalcontactsContactJourneySessions(contactId, {
        ...option('pageSize', pageSize),
        ...option('after', after),
        ...option('includeMerged', includeMerged),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactNote',
    'Get External Contact Note',
    'Fetch a note for an external contact.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      contactId: z.uuid().describe('ExternalContact ID.'),
      noteId: z.uuid().describe('Note ID.'),
      expand: createExpandEnumSchema(noteExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { contactId, noteId, expand }) => ({
      entity: await api.getExternalcontactsContactNote(contactId, noteId, option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactNotes',
    'Get External Contact Notes',
    'List notes for an external contact. Retrieves all pages.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      contactId: z.uuid().describe('ExternalContact ID.'),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'Page size (limited to fetching first 1,000 records; pageSize <= 100; pageNumber * pageSize must be <= 1,000). Defaults to 20.',
        ),
      pageNumber: z
        .number()
        .int()
        .optional()
        .describe(
          'Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 1.',
        ),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'The Note field to sort by. Any of: [createDate]. Direction: [asc, desc]. e.g. createDate:asc, createDate:desc.',
        ),
      expand: createExpandEnumSchema(
        contactNotesExpandValues,
        'Which fields, if any, to expand. mergeset includes notes attached to ancestor contacts which have been merged into this one.',
      ),
    }),
    async (api, { contactId, pageSize, pageNumber, sortOrder, expand }) => {
      const filters = { ...option('sortOrder', sortOrder), ...option('expand', expand) };
      return {
        entities: await getPagedResponse(
          (params) => api.getExternalcontactsContactNotes(contactId, { ...filters, ...params }),
          { ...filters, pageSize: pageSize ?? 100, pageNumber: pageNumber ?? 1 },
        ),
      };
    },
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactUnresolved',
    'Get Unresolved External Contact',
    'Fetch an unresolved external contact.',
    ['externalContacts:contact:view'],
    z.object({
      contactId: z.uuid().describe('ExternalContact ID.'),
      expand: createExpandEnumSchema(
        contactUnresolvedExpandValues,
        'Which fields, if any, to expand.',
      ),
    }),
    async (api, { contactId, expand }) => ({
      entity: await api.getExternalcontactsContactUnresolved(contactId, option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContacts',
    'Get External Contacts',
    'Search for external contacts. Retrieves all pages.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 20.',
        ),
      pageNumber: z
        .number()
        .int()
        .optional()
        .describe(
          'Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 1.',
        ),
      q: z
        .string()
        .optional()
        .describe('User supplied search keywords (no special syntax is currently supported).'),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'The External Contact field to sort by. Any of: [firstName, lastName, middleName, title]. Direction: [asc, desc]. e.g. firstName:asc, title:desc.',
        ),
      expand: createExpandEnumSchema(contactExpandValues, 'Which fields, if any, to expand.'),
      divisionIds: z.array(z.uuid()).optional().describe('Which divisions to search, up to 50.'),
    }),
    async (api, { pageSize, pageNumber, q, sortOrder, expand, divisionIds }) => {
      const filters = {
        ...option('q', q),
        ...option('sortOrder', sortOrder),
        ...option('expand', expand),
        ...option('divisionIds', divisionIds),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getExternalcontactsContacts({ ...filters, ...params }),
          {
            ...filters,
            pageSize: pageSize ?? 100,
            pageNumber: pageNumber ?? 1,
          },
        ),
      };
    },
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsExport',
    'Get External Contacts Export',
    'Get a contact export by export ID. Requires all of the listed permissions, not just one.',
    ['externalContacts:export:view', 'externalContacts:contact:view'],
    z.object({ exportId: z.uuid().describe('Export ID.') }),
    async (api, { exportId }) => ({
      entity: await api.getExternalcontactsContactsExport(exportId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsExports',
    'Get External Contacts Exports',
    'List contact exports for the organization. Requires all of the listed permissions, not just ' +
      'one. Returns a single page; use the response nextUri for additional pages.',
    ['externalContacts:export:view', 'externalContacts:contact:view'],
    z.object({
      divisionIds: z.array(z.uuid()).optional().describe('Division IDs of entities.'),
      after: z
        .string()
        .optional()
        .describe('The cursor that points to the end of the set of entities.'),
      pageSize: z.number().int().optional().describe('Number of entities to return.'),
    }),
    async (api, { divisionIds, after, pageSize }) => ({
      entity: await api.getExternalcontactsContactsExports({
        ...option('divisionIds', divisionIds),
        ...option('after', after),
        ...option('pageSize', pageSize),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchema',
    'Get External Contacts Schema',
    'Get a contact schema.',
    ['externalContacts:customFields:view'],
    z.object({ schemaId: z.string().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entity: await api.getExternalcontactsContactsSchema(schemaId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchemaVersion',
    'Get External Contacts Schema Version',
    'Get a specific version of a contact schema.',
    ['externalContacts:customFields:view'],
    z.object({
      schemaId: z.string().describe('Schema ID.'),
      versionId: z.string().describe('Schema version.'),
    }),
    async (api, { schemaId, versionId }) => ({
      entity: await api.getExternalcontactsContactsSchemaVersion(schemaId, versionId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchemaVersions',
    'Get External Contacts Schema Versions',
    "Get all versions of a contact's schema.",
    ['externalContacts:customFields:view'],
    z.object({ schemaId: z.string().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entities: (await api.getExternalcontactsContactsSchemaVersions(schemaId)).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchemas',
    'Get External Contacts Schemas',
    'Get the list of contact schemas.',
    ['externalContacts:customFields:view'],
    z.object({}),
    async (api) => ({ entities: (await api.getExternalcontactsContactsSchemas()).entities ?? [] }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchemasCoretype',
    'Get External Contacts Schema Core Type',
    'Get a specific named contact schema core type.',
    ['externalContacts:customFields:view'],
    z.object({ coreTypeName: z.string().describe('Name of the core type.') }),
    async (api, { coreTypeName }) => ({
      entity: await api.getExternalcontactsContactsSchemasCoretype(coreTypeName),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchemasCoretypes',
    'Get External Contacts Schema Core Types',
    'Get the core types from which all contact schemas are built.',
    ['externalContacts:customFields:view'],
    z.object({}),
    async (api) => ({
      entities: (await api.getExternalcontactsContactsSchemasCoretypes()).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsContactsSchemasLimits',
    'Get External Contacts Schema Limits',
    'Get quantitative limits on contact schemas.',
    ['externalContacts:customFields:view'],
    z.object({}),
    async (api) => ({ entity: await api.getExternalcontactsContactsSchemasLimits() }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsExternalsource',
    'Get External Source',
    'Fetch an External Source.',
    [
      'externalContacts:externalSource:view',
      'externalContacts:contact:view',
      'externalContacts:externalOrganization:view',
    ],
    z.object({ externalSourceId: z.uuid().describe('External Source ID.') }),
    async (api, { externalSourceId }) => ({
      entity: await api.getExternalcontactsExternalsource(externalSourceId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsExternalsources',
    'Get External Sources',
    'Fetch a list of External Sources. Returns a single page; use the response nextUri or ' +
      'cursors.after for additional pages.',
    [
      'externalContacts:externalSource:view',
      'externalContacts:contact:view',
      'externalContacts:externalOrganization:view',
    ],
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
      limit: z
        .number()
        .int()
        .optional()
        .describe(
          'The number of External Sources per page; must be between 10 and 200, default is 100.',
        ),
      name: z
        .string()
        .optional()
        .describe(
          'Filter by external source name. Filtering is prefix filtering and not an exact match.',
        ),
      active: z.boolean().optional().describe('Filter by active status of external source.'),
    }),
    async (api, { cursor, limit, name, active }) => ({
      entity: await api.getExternalcontactsExternalsources({
        ...option('cursor', cursor),
        ...option('limit', limit),
        ...option('name', name),
        ...option('active', active),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscan',
    'Get Graph Cluster Scan',
    'Returns a single cluster scan.',
    ['externalContacts:graphClusterScan:view'],
    z.object({
      scanId: z.uuid().describe('Cluster scan ID.'),
      expand: createExpandEnumSchema(clusterScanExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { scanId, expand }) => ({
      entity: await api.getExternalcontactsGraphsClusterscan(scanId, option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscanCluster',
    'Get Graph Cluster',
    'Returns a single cluster found by a scan.',
    ['externalContacts:graphCluster:view'],
    z.object({
      scanId: z.uuid().describe('Cluster scan ID.'),
      clusterId: z.uuid().describe('Cluster ID.'),
    }),
    async (api, { scanId, clusterId }) => ({
      entity: await api.getExternalcontactsGraphsClusterscanCluster(scanId, clusterId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscanClusters',
    'Get Graph Clusters',
    'Returns a list of clusters found by a scan. Returns a single page; use the response nextUri ' +
      'or cursors.after for additional pages.',
    ['externalContacts:graphCluster:view'],
    z.object({
      scanId: z.uuid().describe('Cluster scan ID.'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Max number of records to return (must be between 1 and 100). Defaults to 20.'),
      cursor: z.string().optional().describe('Cursor to continue scanning.'),
      divisionIds: z
        .array(z.uuid())
        .optional()
        .describe(
          'Which divisions to filter results to, up to 50 (defaults to all divisions the user has access to).',
        ),
      mergeInfoStatus: z
        .enum(mergeInfoStatusValues)
        .optional()
        .describe('Which merge statuses to filter results to.'),
    }),
    async (api, { scanId, limit, cursor, divisionIds, mergeInfoStatus }) => ({
      entity: await api.getExternalcontactsGraphsClusterscanClusters(scanId, {
        ...option('limit', limit),
        ...option('cursor', cursor),
        ...option('divisionIds', divisionIds),
        ...option('mergeInfoStatus', mergeInfoStatus),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscanStatistics',
    'Get Graph Cluster Scan Statistics',
    'Returns the statistics about a single cluster scan.',
    ['externalContacts:graphClusterScan:view'],
    z.object({ scanId: z.uuid().describe('Cluster scan ID.') }),
    async (api, { scanId }) => ({
      entity: await api.getExternalcontactsGraphsClusterscanStatistics(scanId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscans',
    'Get Graph Cluster Scans',
    'Returns a list of cluster scans. Returns a single page; use the response nextUri or ' +
      'cursors.after for additional pages.',
    ['externalContacts:graphClusterScan:view'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('Max number of records to return (must be between 1 and 100). Defaults to 20.'),
      cursor: z.string().optional().describe('Cursor to continue scanning.'),
      expand: createExpandEnumSchema(clusterScanExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { limit, cursor, expand }) => ({
      entity: await api.getExternalcontactsGraphsClusterscans({
        ...option('limit', limit),
        ...option('cursor', cursor),
        ...option('expand', expand),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscansLatest',
    'Get Latest Graph Cluster Scan',
    'Returns the latest cluster scan.',
    ['externalContacts:contact:view'],
    z.object({
      expand: createExpandEnumSchema(
        clusterScanLatestExpandValues,
        'Which fields, if any, to expand.',
      ),
    }),
    async (api, { expand }) => ({
      entity: await api.getExternalcontactsGraphsClusterscansLatest(option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsClusterscansLatestStatistics',
    'Get Latest Graph Cluster Scan Statistics',
    'Returns the statistics about the latest cluster scan.',
    ['externalContacts:contact:view'],
    z.object({}),
    async (api) => ({ entity: await api.getExternalcontactsGraphsClusterscansLatestStatistics() }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsGraphsSettings',
    'Get Graph Settings',
    'Returns the org-wide settings for ExternalContact graph operations.',
    ['externalContacts:graphSettingsGlobal:view'],
    z.object({}),
    async (api) => ({ entity: await api.getExternalcontactsGraphsSettings() }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportCsvSetting',
    'Get CSV Import Setting',
    'Get settings for a CSV import.',
    ['externalContacts:importCsvSettings:view'],
    z.object({ settingsId: z.uuid().describe('Settings ID.') }),
    async (api, { settingsId }) => ({
      entity: await api.getExternalcontactsImportCsvSetting(settingsId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportCsvSettings',
    'Get CSV Import Settings',
    'Retrieve all CSV import settings for the organization, optionally filtered by ' +
      'externalSettingsId. Returns a single page; use the response nextUri for additional pages.',
    ['externalContacts:importCsvSettings:view'],
    z.object({
      after: z
        .string()
        .optional()
        .describe(
          'The cursor that points to the end of the set of entities that has been returned.',
        ),
      pageSize: z.string().optional().describe('Number of entities to return. Maximum of 200.'),
      externalSettingsId: z
        .string()
        .optional()
        .describe('External Settings ID to filter the list.'),
    }),
    async (api, { after, pageSize, externalSettingsId }) => ({
      entity: await api.getExternalcontactsImportCsvSettings({
        ...option('after', after),
        ...option('pageSize', pageSize),
        ...option('externalSettingsId', externalSettingsId),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportCsvUploadDetails',
    'Get CSV Upload Details',
    'Get details for a CSV upload.',
    ['externalContacts:importCsvUpload:view'],
    z.object({ uploadId: z.uuid().describe('Upload ID.') }),
    async (api, { uploadId }) => ({
      entity: await api.getExternalcontactsImportCsvUploadDetails(uploadId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportCsvUploadPreview',
    'Get CSV Upload Preview',
    'Get a preview for a CSV upload.',
    ['externalContacts:importCsvUpload:view'],
    z.object({ uploadId: z.uuid().describe('Upload ID.') }),
    async (api, { uploadId }) => ({
      entity: await api.getExternalcontactsImportCsvUploadPreview(uploadId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportJob',
    'Get Import Job',
    'Get an import job by ID.',
    ['externalContacts:importJob:view'],
    z.object({
      jobId: z.uuid().describe('Job ID.'),
      expand: createExpandEnumSchema(importExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { jobId, expand }) => ({
      entity: await api.getExternalcontactsImportJob(jobId, option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportJobs',
    'Get Import Jobs',
    'List import jobs for the organization. Returns a single page; use the response nextUri or ' +
      'cursors.after for additional pages.',
    ['externalContacts:importJob:viewAll'],
    z.object({
      expand: createExpandEnumSchema(importExpandValues, 'Which fields, if any, to expand.'),
      after: z
        .string()
        .optional()
        .describe(
          'The cursor that points to the end of the set of entities that has been returned.',
        ),
      pageSize: z
        .string()
        .optional()
        .describe('Number of entities to return. Maximum of 100. Defaults to 25.'),
      sortOrder: z
        .enum(directionSortOrderValues)
        .optional()
        .describe('Direction of sorting. Defaults to Ascending.'),
      jobStatus: z.enum(jobStatusValues).optional().describe('Search term to filter by jobStatus.'),
    }),
    async (api, { expand, after, pageSize, sortOrder, jobStatus }) => ({
      entity: await api.getExternalcontactsImportJobs({
        ...option('expand', expand),
        ...option('after', after),
        ...option('pageSize', pageSize),
        ...option('sortOrder', sortOrder),
        ...option('jobStatus', jobStatus),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportSetting',
    'Get Import Setting',
    'Get an import setting by ID.',
    ['externalContacts:importSettings:view'],
    z.object({ settingsId: z.uuid().describe('Settings ID.') }),
    async (api, { settingsId }) => ({
      entity: await api.getExternalcontactsImportSetting(settingsId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsImportSettings',
    'Get Import Settings',
    'List import settings for the organization. Returns a single page; use the response nextUri ' +
      'for additional pages.',
    ['externalContacts:importSettings:viewAll'],
    z.object({
      after: z
        .string()
        .optional()
        .describe(
          'The cursor that points to the end of the set of entities that has been returned.',
        ),
      pageSize: z
        .string()
        .optional()
        .describe('Number of entities to return. Maximum of 100. Defaults to 25.'),
      sortOrder: z
        .enum(directionSortOrderValues)
        .optional()
        .describe('Direction of sorting. Defaults to Ascending.'),
      name: z.string().optional().describe('Search term to filter by settings name.'),
    }),
    async (api, { after, pageSize, sortOrder, name }) => ({
      entity: await api.getExternalcontactsImportSettings({
        ...option('after', after),
        ...option('pageSize', pageSize),
        ...option('sortOrder', sortOrder),
        ...option('name', name),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsNotesExport',
    'Get Notes Export',
    'Get a notes export by export ID. Requires all of the listed permissions, not just one.',
    [
      'externalContacts:export:view',
      'externalContacts:contact:view',
      'externalContacts:externalOrganization:view',
    ],
    z.object({ exportId: z.uuid().describe('Export ID.') }),
    async (api, { exportId }) => ({ entity: await api.getExternalcontactsNotesExport(exportId) }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsNotesExports',
    'Get Notes Exports',
    'List note exports for the organization. Requires all of the listed permissions, not just ' +
      'one. Returns a single page; use the response nextUri for additional pages.',
    [
      'externalContacts:export:view',
      'externalContacts:contact:view',
      'externalContacts:externalOrganization:view',
    ],
    z.object({
      divisionIds: z.array(z.uuid()).optional().describe('Division IDs of entities.'),
      after: z
        .string()
        .optional()
        .describe('The cursor that points to the end of the set of entities.'),
      pageSize: z.number().int().optional().describe('Number of entities to return.'),
    }),
    async (api, { divisionIds, after, pageSize }) => ({
      entity: await api.getExternalcontactsNotesExports({
        ...option('divisionIds', divisionIds),
        ...option('after', after),
        ...option('pageSize', pageSize),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganization',
    'Get External Organization',
    'Fetch an external organization.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      externalOrganizationId: z.uuid().describe('External Organization ID.'),
      expand: createExpandEnumSchema(organizationExpandValues, 'Which fields, if any, to expand.'),
      includeTrustors: z
        .boolean()
        .optional()
        .describe('Whether to include trustor information embedded in the externalOrganization.'),
    }),
    async (api, { externalOrganizationId, expand, includeTrustors }) => ({
      entity: await api.getExternalcontactsOrganization(externalOrganizationId, {
        ...option('expand', expand),
        ...option('includeTrustors', includeTrustors),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationContacts',
    'Get External Organization Contacts',
    'Search for external contacts in an external organization. Retrieves all pages.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      externalOrganizationId: z.uuid().describe('External Organization ID.'),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 20.',
        ),
      pageNumber: z
        .number()
        .int()
        .optional()
        .describe(
          'Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 1.',
        ),
      q: z
        .string()
        .optional()
        .describe('User supplied search keywords (no special syntax is currently supported).'),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'The External Contact field to sort by. Any of: [firstName, lastName, middleName, title]. Direction: [asc, desc]. e.g. firstName:asc, title:desc.',
        ),
      expand: createExpandEnumSchema(contactExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { externalOrganizationId, pageSize, pageNumber, q, sortOrder, expand }) => {
      const filters = {
        ...option('q', q),
        ...option('sortOrder', sortOrder),
        ...option('expand', expand),
      };
      return {
        entities: await getPagedResponse(
          (params) =>
            api.getExternalcontactsOrganizationContacts(externalOrganizationId, {
              ...filters,
              ...params,
            }),
          { ...filters, pageSize: pageSize ?? 100, pageNumber: pageNumber ?? 1 },
        ),
      };
    },
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationIdentifiers',
    'Get External Organization Identifiers',
    'List the identifiers for an external organization.',
    ['externalContacts:externalOrganization:view'],
    z.object({ externalOrganizationId: z.uuid().describe('External Organization ID.') }),
    async (api, { externalOrganizationId }) => ({
      entities:
        (await api.getExternalcontactsOrganizationIdentifiers(externalOrganizationId)).entities ??
        [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationNote',
    'Get External Organization Note',
    'Fetch a note for an external organization.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      externalOrganizationId: z.uuid().describe('External Organization ID.'),
      noteId: z.uuid().describe('Note ID.'),
      expand: createExpandEnumSchema(noteExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { externalOrganizationId, noteId, expand }) => ({
      entity: await api.getExternalcontactsOrganizationNote(
        externalOrganizationId,
        noteId,
        option('expand', expand),
      ),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationNotes',
    'Get External Organization Notes',
    'List notes for an external organization. Retrieves all pages.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      externalOrganizationId: z.uuid().describe('External Organization ID.'),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 20.',
        ),
      pageNumber: z
        .number()
        .int()
        .optional()
        .describe(
          'Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 1.',
        ),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'The Note field to sort by. Any of: [createDate]. Direction: [asc, desc]. e.g. createDate:asc, createDate:desc.',
        ),
      expand: createExpandEnumSchema(noteExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { externalOrganizationId, pageSize, pageNumber, sortOrder, expand }) => {
      const filters = { ...option('sortOrder', sortOrder), ...option('expand', expand) };
      return {
        entities: await getPagedResponse(
          (params) =>
            api.getExternalcontactsOrganizationNotes(externalOrganizationId, {
              ...filters,
              ...params,
            }),
          { ...filters, pageSize: pageSize ?? 100, pageNumber: pageNumber ?? 1 },
        ),
      };
    },
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationRelationships',
    'Get External Organization Relationships',
    'Fetch relationships for an external organization. Retrieves all pages.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      externalOrganizationId: z.uuid().describe('External Organization ID.'),
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 20.',
        ),
      pageNumber: z
        .number()
        .int()
        .optional()
        .describe(
          'Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 1.',
        ),
      expand: createExpandEnumSchema(relationshipExpandValues, 'Which fields, if any, to expand.'),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'The Relationship field to sort by. Any of: [createDate, relationship]. Direction: [asc, desc]. e.g. createDate:asc, relationship:desc.',
        ),
    }),
    async (api, { externalOrganizationId, pageSize, pageNumber, expand, sortOrder }) => {
      const filters = { ...option('expand', expand), ...option('sortOrder', sortOrder) };
      return {
        entities: await getPagedResponse(
          (params) =>
            api.getExternalcontactsOrganizationRelationships(externalOrganizationId, {
              ...filters,
              ...params,
            }),
          { ...filters, pageSize: pageSize ?? 100, pageNumber: pageNumber ?? 1 },
        ),
      };
    },
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizations',
    'Get External Organizations',
    'Search for external organizations. Retrieves all pages.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      pageSize: z
        .number()
        .int()
        .optional()
        .describe(
          'Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 20.',
        ),
      pageNumber: z
        .number()
        .int()
        .optional()
        .describe(
          'Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be <= 1,000). Defaults to 1.',
        ),
      q: z.string().optional().describe('Search query.'),
      trustorId: z
        .array(z.uuid())
        .optional()
        .describe(
          "Search for external organizations by trustorIds (limit 25). If supplied, the 'q' parameter is ignored. Items are returned in the order requested.",
        ),
      sortOrder: z
        .string()
        .optional()
        .describe(
          'The Organization field to sort by. Any of: [companyType, industry, name]. Direction: [asc, desc]. e.g. companyType:asc, industry:desc.',
        ),
      expand: createExpandEnumSchema(organizationExpandValues, 'Which fields, if any, to expand.'),
      includeTrustors: z
        .boolean()
        .optional()
        .describe('Whether to include trustor information embedded in the externalOrganization.'),
      divisionIds: z.array(z.uuid()).optional().describe('Which divisions to search, up to 50.'),
    }),
    async (
      api,
      { pageSize, pageNumber, q, trustorId, sortOrder, expand, includeTrustors, divisionIds },
    ) => {
      const filters = {
        ...option('q', q),
        ...option('trustorId', trustorId),
        ...option('sortOrder', sortOrder),
        ...option('expand', expand),
        ...option('includeTrustors', includeTrustors),
        ...option('divisionIds', divisionIds),
      };
      return {
        entities: await getPagedResponse(
          (params) => api.getExternalcontactsOrganizations({ ...filters, ...params }),
          { ...filters, pageSize: pageSize ?? 100, pageNumber: pageNumber ?? 1 },
        ),
      };
    },
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsExport',
    'Get Organizations Export',
    'Get an organizations export by export ID. Requires all of the listed permissions, not just one.',
    ['externalContacts:export:view', 'externalContacts:externalOrganization:view'],
    z.object({ exportId: z.uuid().describe('Export ID.') }),
    async (api, { exportId }) => ({
      entity: await api.getExternalcontactsOrganizationsExport(exportId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsExports',
    'Get Organizations Exports',
    'List organization exports for the organization. Requires all of the listed permissions, not ' +
      'just one. Returns a single page; use the response nextUri for additional pages.',
    ['externalContacts:export:view', 'externalContacts:externalOrganization:view'],
    z.object({
      divisionIds: z.array(z.uuid()).optional().describe('Division IDs of entities.'),
      after: z
        .string()
        .optional()
        .describe('The cursor that points to the end of the set of entities.'),
      pageSize: z.number().int().optional().describe('Number of entities to return.'),
    }),
    async (api, { divisionIds, after, pageSize }) => ({
      entity: await api.getExternalcontactsOrganizationsExports({
        ...option('divisionIds', divisionIds),
        ...option('after', after),
        ...option('pageSize', pageSize),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchema',
    'Get External Organizations Schema',
    'Get an organization schema.',
    ['externalContacts:customFields:view'],
    z.object({ schemaId: z.string().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entity: await api.getExternalcontactsOrganizationsSchema(schemaId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchemaVersion',
    'Get External Organizations Schema Version',
    'Get a specific version of an organization schema.',
    ['externalContacts:customFields:view'],
    z.object({
      schemaId: z.string().describe('Schema ID.'),
      versionId: z.string().describe('Schema version.'),
    }),
    async (api, { schemaId, versionId }) => ({
      entity: await api.getExternalcontactsOrganizationsSchemaVersion(schemaId, versionId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchemaVersions',
    'Get External Organizations Schema Versions',
    "Get all versions of an external organization's schema.",
    ['externalContacts:customFields:view'],
    z.object({ schemaId: z.string().describe('Schema ID.') }),
    async (api, { schemaId }) => ({
      entities: (await api.getExternalcontactsOrganizationsSchemaVersions(schemaId)).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchemas',
    'Get External Organizations Schemas',
    'Get the list of organization schemas.',
    ['externalContacts:customFields:view'],
    z.object({}),
    async (api) => ({
      entities: (await api.getExternalcontactsOrganizationsSchemas()).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchemasCoretype',
    'Get External Organizations Schema Core Type',
    'Get a specific named organization schema core type.',
    ['externalContacts:customFields:view'],
    z.object({ coreTypeName: z.string().describe('Name of the core type.') }),
    async (api, { coreTypeName }) => ({
      entity: await api.getExternalcontactsOrganizationsSchemasCoretype(coreTypeName),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchemasCoretypes',
    'Get External Organizations Schema Core Types',
    'Get the core types from which all organization schemas are built.',
    ['externalContacts:customFields:view'],
    z.object({}),
    async (api) => ({
      entities: (await api.getExternalcontactsOrganizationsSchemasCoretypes()).entities ?? [],
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsOrganizationsSchemasLimits',
    'Get External Organizations Schema Limits',
    'Get quantitative limits on organization schemas.',
    ['externalContacts:customFields:view'],
    z.object({}),
    async (api) => ({ entity: await api.getExternalcontactsOrganizationsSchemasLimits() }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsRelationship',
    'Get External Contacts Relationship',
    'Fetch a relationship.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      relationshipId: z.uuid().describe('Relationship ID.'),
      expand: createExpandEnumSchema(relationshipExpandValues, 'Which fields, if any, to expand.'),
    }),
    async (api, { relationshipId, expand }) => ({
      entity: await api.getExternalcontactsRelationship(relationshipId, option('expand', expand)),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsRelationshipsExport',
    'Get Relationships Export',
    'Get a relationships export by export ID. Requires all of the listed permissions, not just one.',
    ['externalContacts:export:view', 'externalContacts:externalOrganization:view'],
    z.object({ exportId: z.uuid().describe('Export ID.') }),
    async (api, { exportId }) => ({
      entity: await api.getExternalcontactsRelationshipsExport(exportId),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsRelationshipsExports',
    'Get Relationships Exports',
    'List relationship exports for the organization. Requires all of the listed permissions, not ' +
      'just one. Returns a single page; use the response nextUri for additional pages.',
    ['externalContacts:export:view', 'externalContacts:externalOrganization:view'],
    z.object({
      divisionIds: z.array(z.uuid()).optional().describe('Division IDs of entities.'),
      after: z
        .string()
        .optional()
        .describe('The cursor that points to the end of the set of entities.'),
      pageSize: z.number().int().optional().describe('Number of entities to return.'),
    }),
    async (api, { divisionIds, after, pageSize }) => ({
      entity: await api.getExternalcontactsRelationshipsExports({
        ...option('divisionIds', divisionIds),
        ...option('after', after),
        ...option('pageSize', pageSize),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsReversewhitepageslookup',
    'Reverse Whitepages Lookup',
    'Look up contacts based on an attribute (email address, e164 phone number, or Twitter screen ' +
      'name). Maximum of 25 values returned.',
    ['externalContacts:contact:view'],
    z.object({
      lookupVal: z
        .string()
        .describe(
          'User supplied value to lookup contacts (supports email addresses, e164 phone numbers, Twitter screen names).',
        ),
      expand: createExpandEnumSchema(
        reverseWhitepagesExpandValues,
        'Which field, if any, to expand.',
      ),
      divisionId: z
        .string()
        .optional()
        .describe(
          'Specifies which division to lookup contacts in, for the given lookup value. Defaults to "*" (all divisions).',
        ),
    }),
    async (api, { lookupVal, expand, divisionId }) => ({
      entity: await api.getExternalcontactsReversewhitepageslookup(lookupVal, {
        ...option('expand', expand),
        ...option('divisionId', divisionId),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanContacts',
    'Scan External Contacts',
    'Scan for external contacts using cursor paging. Returns a single page; use the response ' +
      'cursors.after for additional pages.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('The number of contacts per page; must be between 10 and 200, default is 100.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
      divisionId: z
        .string()
        .optional()
        .describe('The division to scan over. Defaults to "*" (all divisions).'),
    }),
    async (api, { limit, cursor, divisionId }) => ({
      entity: await api.getExternalcontactsScanContacts({
        ...option('limit', limit),
        ...option('cursor', cursor),
        ...option('divisionId', divisionId),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanContactsDivisionviewsAll',
    'Scan All External Contacts',
    'Scan for external contacts across all divisions using cursor paging. Returns a single page; ' +
      'use the response cursors.after for additional pages.',
    ['externalContacts:contact:viewAll'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('The number of contacts per page; must be between 10 and 200, default is 100.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
    }),
    async (api, { limit, cursor }) => ({
      entity: await api.getExternalcontactsScanContactsDivisionviewsAll({
        ...option('limit', limit),
        ...option('cursor', cursor),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanNotes',
    'Scan External Contact Notes',
    'Scan for notes using cursor paging. Returns a single page; use the response cursors.after ' +
      'for additional pages.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('The number of notes per page; must be between 10 and 200, default is 100.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
      divisionId: z
        .string()
        .optional()
        .describe('The division to scan over. Defaults to "*" (all divisions).'),
    }),
    async (api, { limit, cursor, divisionId }) => ({
      entity: await api.getExternalcontactsScanNotes({
        ...option('limit', limit),
        ...option('cursor', cursor),
        ...option('divisionId', divisionId),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanNotesDivisionviewsAll',
    'Scan All External Contact Notes',
    'Scan for notes across all divisions using cursor paging. Returns a single page; use the ' +
      'response cursors.after for additional pages.',
    ['externalContacts:contact:viewAll'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('The number of notes per page; must be between 10 and 200, default is 100.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
    }),
    async (api, { limit, cursor }) => ({
      entity: await api.getExternalcontactsScanNotesDivisionviewsAll({
        ...option('limit', limit),
        ...option('cursor', cursor),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanOrganizations',
    'Scan External Organizations',
    'Scan for external organizations using cursor paging. Returns a single page; use the response ' +
      'cursors.after for additional pages.',
    ['relate:externalOrganization:view', 'externalContacts:externalOrganization:view'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe(
          'The number of organizations per page; must be between 10 and 200, default is 100.',
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
      divisionId: z
        .string()
        .optional()
        .describe('The division to scan over. Defaults to "*" (all divisions).'),
    }),
    async (api, { limit, cursor, divisionId }) => ({
      entity: await api.getExternalcontactsScanOrganizations({
        ...option('limit', limit),
        ...option('cursor', cursor),
        ...option('divisionId', divisionId),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanOrganizationsDivisionviewsAll',
    'Scan All External Organizations',
    'Scan for external organizations across all divisions using cursor paging. Returns a single ' +
      'page; use the response cursors.after for additional pages.',
    ['externalContacts:externalOrganization:viewAll'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe(
          'The number of organizations per page; must be between 10 and 200, default is 100.',
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
    }),
    async (api, { limit, cursor }) => ({
      entity: await api.getExternalcontactsScanOrganizationsDivisionviewsAll({
        ...option('limit', limit),
        ...option('cursor', cursor),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanRelationships',
    'Scan External Contacts Relationships',
    'Scan for relationships using cursor paging. Returns a single page; use the response ' +
      'cursors.after for additional pages.',
    ['relate:contact:view', 'externalContacts:contact:view'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe(
          'The number of relationships per page; must be between 10 and 200, default is 100.',
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
      divisionId: z
        .string()
        .optional()
        .describe('The division to scan over. Defaults to "*" (all divisions).'),
    }),
    async (api, { limit, cursor, divisionId }) => ({
      entity: await api.getExternalcontactsScanRelationships({
        ...option('limit', limit),
        ...option('cursor', cursor),
        ...option('divisionId', divisionId),
      }),
    }),
  );

  registerExternalContactsGetTool(
    server,
    'getExternalcontactsScanRelationshipsDivisionviewsAll',
    'Scan All External Contacts Relationships',
    'Scan for relationships across all divisions using cursor paging. Returns a single page; use ' +
      'the response cursors.after for additional pages.',
    ['externalContacts:contact:viewAll'],
    z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe(
          'The number of relationships per page; must be between 10 and 200, default is 100.',
        ),
      cursor: z
        .string()
        .optional()
        .describe(
          'Indicates where to resume query results (not required for first page); each page returns a new cursor with a 24h TTL.',
        ),
    }),
    async (api, { limit, cursor }) => ({
      entity: await api.getExternalcontactsScanRelationshipsDivisionviewsAll({
        ...option('limit', limit),
        ...option('cursor', cursor),
      }),
    }),
  );
}

export { registerFunctions as gcExternalContactsRegisterFunctions };
