# AGENTS.md

This file documents the already-implemented MCP tool catalog for Genesys Cloud
API operations: per-domain tool tables, SDK/Swagger mismatches, pagination
judgment calls, and tool-name collisions that were resolved. It is maintained
for coding agents and contributors extending this tool set; end-user setup,
transports, and MCP client configuration live in [README.md](./README.md).

To implement a new domain or extend an existing one, follow
[.github/agents/genesys-operations.agent.md](./.github/agents/genesys-operations.agent.md),
which owns the _process_ (Swagger lookup, SDK cross-check, shared helper,
pagination strategy, naming, tests). This file documents the _result_: what
exists today and why specific choices were made, so that process doesn't need
to be re-derived or re-discovered for existing domains.

Three control tools (`ping`, `verify_login`, `invalidate_login`) are documented
in [README.md](./README.md) since they're relevant to any user running the
server, not only to someone extending it.

## Conventions

Page-number listings aggregate all pages into `structuredContent.entities`;
cursor-based endpoints return the SDK page in `structuredContent.entity` so the
response cursor can be used in a later call. Inputs use the published enum values
where the Swagger schema defines them. This convention applies to every domain
below.

`*` marks a required input. Tools include the documented OAuth scopes and
explicit Genesys permissions in their descriptions. `—` means the Swagger
operation does not declare a specific permission requirement.

## Users (`UsersApi`)

The `get-users` tool returns users from all pages as an `entities` array in MCP
`structuredContent`. It requires the appropriate Genesys Cloud permissions.

The `get-user-by-id` tool accepts a user UUID and optional `expand` fields, and
returns the user in `structuredContent.entity`.

`get-users` and `get-user-by-id` validate expansion names against the documented
SDK/API values. The original four user tools share the same registration and
error-handling helper as the other Users API tools; their names and JSON wrappers
are unchanged.

The `get-user-state` tool accepts a `userId` UUID and calls
`GET /api/v2/users/{userId}/state` through the SDK. It returns the state, version,
state change reason and date in `structuredContent.entity` and requires
`directory:userStateChange:view` permission. It has no paging or expansion options.

The following tools expose the remaining GET operations on the installed SDK `UsersApi`:

| Tool                                                    | Inputs                                                                                                                                                              | `structuredContent`    | Permission(s)                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| `get-analytics-users-aggregates-job`                    | `jobId*`                                                                                                                                                            | `entity`               | `analytics:userAggregate:view`                             |
| `get-analytics-users-aggregates-job-results`            | `jobId*`, `cursor?`                                                                                                                                                 | `entity` (cursor page) | `analytics:userAggregate:view`                             |
| `get-analytics-users-details-job`                       | `jobId*`                                                                                                                                                            | `entity`               | `analytics:userDetail:view`                                |
| `get-analytics-users-details-job-results`               | `jobId*`, `cursor?`, `pageSize?`                                                                                                                                    | `entity` (cursor page) | `analytics:userDetail:view`                                |
| `get-analytics-users-details-jobs-availability`         | —                                                                                                                                                                   | `entity`               | `analytics:userDetail:view`                                |
| `get-authorization-divisionspermitted-me`               | `permission*`, `name?`                                                                                                                                              | `entities`             | —                                                          |
| `get-authorization-divisionspermitted-paged-me`         | `permission*`, `pageNumber?`, `pageSize?`                                                                                                                           | `entities` (all pages) | —                                                          |
| `get-authorization-divisionspermitted-paged-subject-id` | `subjectId*`, `permission*`, `pageNumber?`, `pageSize?`                                                                                                             | `entities` (all pages) | —                                                          |
| `get-authorization-subject`                             | `subjectId*`, `includeDuplicates?`, `includeFullRoles?`                                                                                                             | `entity`               | `authorization:grant:view`                                 |
| `get-authorization-subjects-me`                         | `includeDuplicates?`, `includeFullRoles?`                                                                                                                           | `entity`               | —                                                          |
| `get-fieldconfig`                                       | `type*` (`person`, `group`, or `org`)                                                                                                                               | `entity`               | —                                                          |
| `get-profiles-users`                                    | `pageSize?`, `pageNumber?`, `id?`, `jid?`, `sortOrder?`, `expand?`, `integrationPresenceSource?`                                                                    | `entities` (all pages) | —                                                          |
| `get-routing-directroutingbackup-settings-me`           | —                                                                                                                                                                   | `entity`               | `routing:directRoutingBackup:selfView`                     |
| `get-routing-user-directroutingbackup-settings`         | `userId*`                                                                                                                                                           | `entity`               | `routing:directRoutingBackup:view`                         |
| `get-routing-user-utilization`                          | `userId*`                                                                                                                                                           | `entity`               | `routing:utilization:manage` or `routing:utilization:view` |
| `get-user-adjacents`                                    | `userId*`, `expand?`                                                                                                                                                | `entity`               | —                                                          |
| `get-user-callforwarding`                               | `userId*`                                                                                                                                                           | `entity`               | `conversation:callForwarding:view`                         |
| `get-user-customattribute`                              | `userId*`, `schemaId*`                                                                                                                                              | `entity`               | `directory:user:view`                                      |
| `get-user-customattributes-bulk`                        | `userId*`, `schemaIds*`                                                                                                                                             | `entities`             | `directory:user:view`                                      |
| `get-user-directreports`                                | `userId*`, `expand?`                                                                                                                                                | `entities`             | —                                                          |
| `get-user-externalid`                                   | `userId*`                                                                                                                                                           | `entities`             | —                                                          |
| `get-user-externalid-authority-name`                    | `userId*`, `authorityName*`                                                                                                                                         | `entity`               | —                                                          |
| `get-user-favorites`                                    | `userId*`, `pageSize?`, `pageNumber?`, `sortOrder?`, `expand?`                                                                                                      | `entities` (all pages) | — (deprecated API)                                         |
| `get-user-geolocation`                                  | `userId*`, `clientId*`                                                                                                                                              | `entity`               | —                                                          |
| `get-user-outofoffice`                                  | `userId*`                                                                                                                                                           | `entity`               | —                                                          |
| `get-user-profile`                                      | `userId*`, `expand?`, `integrationPresenceSource?`                                                                                                                  | `entity`               | —                                                          |
| `get-user-profileskills`                                | `userId*`                                                                                                                                                           | `entities`             | `directory:userProfile:view`                               |
| `get-user-queues`                                       | `userId*`, `pageSize?`, `pageNumber?`, `joined?`, `divisionId?`                                                                                                     | `entities` (all pages) | `routing:queue:view`                                       |
| `get-user-roles`                                        | `subjectId*`                                                                                                                                                        | `entity`               | `authorization:grant:view`                                 |
| `get-user-routinglanguages`                             | `userId*`, `pageSize?`, `pageNumber?`, `sortOrder?`                                                                                                                 | `entities` (all pages) | —                                                          |
| `get-user-routingskills`                                | `userId*`, `pageSize?`, `pageNumber?`, `sortOrder?`                                                                                                                 | `entities` (all pages) | —                                                          |
| `get-user-routingstatus`                                | `userId*`                                                                                                                                                           | `entity`               | —                                                          |
| `get-user-skillgroups`                                  | `userId*`, `after?`, `before?`                                                                                                                                      | `entity` (cursor page) | `routing:skillGroup:view`                                  |
| `get-user-station`                                      | `userId*`                                                                                                                                                           | `entity`               | `telephony:otherStationAssociation:view`                   |
| `get-user-superiors`                                    | `userId*`, `expand?`                                                                                                                                                | `entities`             | —                                                          |
| `get-user-trustors`                                     | `userId*`, `pageSize?`, `pageNumber?`                                                                                                                               | `entities` (all pages) | `authorization:orgTrustor:view`                            |
| `get-user-verifiers`                                    | `userId*`                                                                                                                                                           | `entity`               | `mfa:verifier:view`                                        |
| `get-users-chats-me`                                    | `excludeClosed?`, `includePresence?`, `includeRoomOwners?`, `after?`                                                                                                | `entity` (cursor page) | `chat:chat:access` or `user:chats:view`                    |
| `get-users-customattributes-schema`                     | `schemaId*`                                                                                                                                                         | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-customattributes-schema-version`             | `schemaId*`, `versionId*`                                                                                                                                           | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-customattributes-schema-versions`            | `schemaId*`                                                                                                                                                         | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-customattributes-schemas`                    | —                                                                                                                                                                   | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-customattributes-schemas-coretype`           | `coreTypeName*`                                                                                                                                                     | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-customattributes-schemas-coretypes`          | —                                                                                                                                                                   | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-customattributes-schemas-limits`             | —                                                                                                                                                                   | `entity`               | `users:customAttributesSchema:view`                        |
| `get-users-development-activities`                      | `userId[]?`, `moduleId?`, `interval?`, `completionInterval?`, `overdue?`, `pass?`, `pageSize?`, `pageNumber?`, `sortOrder?`, `types?`, `statuses?`, `relationship?` | `entities` (all pages) | `learning:assignment:view` or `coaching:appointment:view`  |
| `get-users-development-activities-me`                   | `moduleId?`, `interval?`, `completionInterval?`, `overdue?`, `pass?`, `pageSize?`, `pageNumber?`, `sortOrder?`, `types?`, `statuses?`, `relationship?`              | `entities` (all pages) | —                                                          |
| `get-users-development-activity`                        | `activityId*`, `type*`                                                                                                                                              | `entity`               | `learning:assignment:view` or `coaching:appointment:view`  |
| `get-users-externalid-authority-name-external-key`      | `authorityName*`, `externalKey*`, `expand?`                                                                                                                         | `entity`               | —                                                          |
| `get-users-me-verifiers`                                | —                                                                                                                                                                   | `entity`               | —                                                          |
| `get-users-query`                                       | `cursor?`, `pageSize?`, `sortOrder?`, `expand?`, `integrationPresenceSource?`, `userCustomAttributeSchemaIds?`, `state?`                                            | `entity` (cursor page) | `directory:user:view`                                      |
| `get-users-search`                                      | `q64*`, `expand?`, `integrationPresenceSource?`                                                                                                                     | `entity`               | `directory:user:view`                                      |
| `get-users-stations-me`                                 | —                                                                                                                                                                   | `entity`               | `telephony:selfStationAssociation:view`                    |

### Presence

GET operations on the installed SDK `PresenceApi` (13 tools, full coverage).

| Tool                                 | Inputs                                                | `structuredContent`    | Permission(s)                                                                  |
| ------------------------------------ | ----------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `get-presence-definition`            | `definitionId*`, `localeCode?`                        | `entity`               | `presence:presenceDefinition:view`                                             |
| `get-presence-definitions`           | `deactivated?`, `divisionId[]?`, `localeCode?`        | `entity`               | `presence:presenceDefinition:view`                                             |
| `get-presence-settings`              | —                                                     | `entity`               | `presence:settings:view`                                                       |
| `get-presence-source`                | `sourceId*`                                           | `entity`               | `presence:source:view`                                                         |
| `get-presence-sources`               | `deactivated?`                                        | `entity`               | `presence:source:view`                                                         |
| `get-presence-user-primarysource`    | `userId*`                                             | `entity`               | `presence:userPrimarySource:view`                                              |
| `get-presencedefinition`             | `presenceId*`, `localeCode?`                          | `entity`               | `presence:presenceDefinition:view` (deprecated; use `get-presence-definition`) |
| `get-presencedefinitions`            | `deleted?`, `localeCode?`, `pageNumber?`, `pageSize?` | `entities` (all pages) | — (deprecated; use `get-presence-definitions`)                                 |
| `get-systempresences`                | —                                                     | `entities`             | —                                                                              |
| `get-user-presence`                  | `userId*`, `sourceId*`                                | `entity`               | —                                                                              |
| `get-user-presences-purecloud`       | `userId*`                                             | `entity`               | —                                                                              |
| `get-users-presence-bulk`            | `sourceId*`, `id[]?` (max 50)                         | `entities`             | —                                                                              |
| `get-users-presences-purecloud-bulk` | `id[]?` (max 50)                                      | `entities`             | —                                                                              |

### Organization

GET operations on the installed SDK `OrganizationApi` (13 tools, full coverage).
`get-organization-fieldconfig` is renamed from the SDK's `getFieldconfig` to avoid
colliding with the Users domain's `get-fieldconfig`, which hits the same endpoint.

| Tool                                          | Inputs                                                 | `structuredContent`                   | Permission(s)                               |
| --------------------------------------------- | ------------------------------------------------------ | ------------------------------------- | ------------------------------------------- |
| `get-organization-fieldconfig`                | `type*` (`person`, `group`, or `org`)                  | `entity`                              | —                                           |
| `get-organizations-authentication-settings`   | —                                                      | `entity`                              | `directory:organization:admin`              |
| `get-organizations-embeddedintegration`       | —                                                      | `entity`                              | — (deprecated)                              |
| `get-organizations-ipaddressauthentication`   | —                                                      | `entity`                              | `directory:organization:admin` (deprecated) |
| `get-organizations-limits-changerequest`      | `requestId*`                                           | `entity`                              | `limits:organization:view`                  |
| `get-organizations-limits-changerequests`     | `after?`, `before?`, `status?`, `pageSize?`, `expand?` | `entity` (single page, use `nextUri`) | `limits:organization:view`                  |
| `get-organizations-limits-docs`               | —                                                      | `entity`                              | —                                           |
| `get-organizations-limits-docs-freetrial`     | —                                                      | `entity`                              | —                                           |
| `get-organizations-limits-namespace`          | `namespaceName*`                                       | `entities`                            | —                                           |
| `get-organizations-limits-namespace-defaults` | `namespaceName*`                                       | `entities`                            | —                                           |
| `get-organizations-limits-namespaces`         | `pageSize?`, `pageNumber?`                             | `entities` (all pages)                | —                                           |
| `get-organizations-me`                        | —                                                      | `entity`                              | —                                           |
| `get-organizations-whitelist`                 | —                                                      | `entity`                              | — (deprecated)                              |

### Objects (authorization divisions)

GET operations on the installed SDK `ObjectsApi` (6 tools, full coverage).

| Tool                                  | Inputs                                                 | `structuredContent`                                           | Permission(s)                        |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------ |
| `get-authorization-division`          | `divisionId*`, `objectCount?`                          | `entity`                                                      | —                                    |
| `get-authorization-divisions`         | `sortBy?`, `expand?`, `objectCount?`, `id[]?`, `name?` | `entities` (all pages)                                        | —                                    |
| `get-authorization-divisions-deleted` | —                                                      | `entities` (all pages)                                        | `authorization:divisionDeleted:view` |
| `get-authorization-divisions-home`    | —                                                      | `entity`                                                      | —                                    |
| `get-authorization-divisions-limit`   | —                                                      | `limit` (number)                                              | —                                    |
| `get-authorization-divisions-query`   | `before?`, `after?`, `pageSize?`, `id[]?`, `name?`     | `entities`, `nextUri`, `previousUri`, `selfUri` (single page) | —                                    |

### License

GET operations on the installed SDK `LicenseApi` (5 tools, full coverage).

| Tool                      | Inputs         | `structuredContent`    | Permission(s)                                             |
| ------------------------- | -------------- | ---------------------- | --------------------------------------------------------- |
| `get-license-definition`  | `licenseId*`   | `entity`               | `authorization:grant:add` or `authorization:license:view` |
| `get-license-definitions` | —              | `entities`             | `authorization:grant:add` or `authorization:license:view` |
| `get-license-toggle`      | `featureName*` | `entity`               | — (deprecated; always returns `true`)                     |
| `get-license-user`        | `userId*`      | `entity`               | `authorization:grant:add` or `authorization:license:view` |
| `get-license-users`       | —              | `entities` (all pages) | —                                                         |

### Groups

GET operations on the installed SDK `GroupsApi` (9 tools, full coverage).
`get-group-fieldconfig` is renamed from the SDK's `getFieldconfig` to avoid
colliding with the Users and Organization domains' field-config tools.

| Tool                        | Inputs                                                           | `structuredContent`    | Permission(s)                                       |
| --------------------------- | ---------------------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| `get-groups`                | `pageSize?`, `pageNumber?`, `id[]?`, `jabberId[]?`, `sortOrder?` | `entities` (all pages) | —                                                   |
| `get-group`                 | `groupId*`                                                       | `entity`               | —                                                   |
| `get-group-dynamicsettings` | `groupId*`                                                       | `entity`               | — (undocumented preview SDK method; see note below) |
| `get-group-individuals`     | `groupId*`                                                       | `entities`             | —                                                   |
| `get-group-members`         | `groupId*`, `pageSize?`, `pageNumber?`, `sortOrder?`, `expand?`  | `entities` (all pages) | —                                                   |
| `get-group-profile`         | `groupId*`, `fields?`                                            | `entity`               | — (deprecated; use `get-group`/`get-groups`)        |
| `get-groups-search`         | `q64*`, `expand?`                                                | `entity`               | —                                                   |
| `get-group-fieldconfig`     | `type*` (`person`, `group`, or `org`)                            | `entity`               | — (deprecated)                                      |
| `get-profiles-groups`       | `pageSize?`, `pageNumber?`, `id[]?`, `jabberId[]?`, `sortOrder?` | `entities` (all pages) | — (deprecated; use `get-groups`)                    |

`get-group-dynamicsettings` (`GroupsApi.getGroupDynamicsettings`) has no
corresponding Swagger operation; it is implemented directly from the installed
SDK, which marks it a preview method "subject to both breaking and non-breaking
changes at any time without notice." Its OAuth scopes are inferred from sibling
Groups endpoints, not confirmed by Swagger.

### External Contacts

GET operations on the installed SDK `ExternalContactsApi` (65 tools). All share
the OAuth scopes `external-contacts`/`external-contacts:readonly`. Tool names
follow the SDK method name (e.g. `getExternalcontactsContact` ->
`get-externalcontacts-contact`); call `listTools` for the authoritative set,
since documenting 65 individual input shapes here is impractical to keep in
sync. Grouped by sub-area:

- **Contacts**: `get-externalcontacts-contact(-identifiers|-journey-segments|
-journey-sessions|-note|-notes|-unresolved)`, `get-externalcontacts-contacts`
  (all pages), `get-externalcontacts-contacts-export(s)`.
- **Contact schemas**: `get-externalcontacts-contacts-schema(-version|-versions)`,
  `get-externalcontacts-contacts-schemas(-coretype|-coretypes|-limits)`.
- **Organizations**: `get-externalcontacts-organization(-contacts|-identifiers|
-note|-notes|-relationships)`, `get-externalcontacts-organizations` (all
  pages), `get-externalcontacts-organizations-export(s)`,
  `get-externalcontacts-organizations-schema*` (same shape as contact schemas).
- **Relationships**: `get-externalcontacts-relationship`,
  `get-externalcontacts-relationships-export(s)`.
- **Notes exports**: `get-externalcontacts-notes-export(s)`.
- **Deduplication/graphs**: `get-externalcontacts-graphs-settings`,
  `get-externalcontacts-graphs-clusterscan(s)(-latest)`,
  `get-externalcontacts-graphs-clusterscan-cluster(s)`,
  `get-externalcontacts-graphs-clusterscan(s)-latest-statistics`.
- **Imports**: `get-externalcontacts-import-job(s)`,
  `get-externalcontacts-import-setting(s)`,
  `get-externalcontacts-import-csv-setting(s)`,
  `get-externalcontacts-import-csv-upload-details|preview`.
- **Scans/division views**: `get-externalcontacts-scan-contacts(-divisionviews-all)`,
  `get-externalcontacts-scan-notes(-divisionviews-all)`,
  `get-externalcontacts-scan-organizations(-divisionviews-all)`,
  `get-externalcontacts-scan-relationships(-divisionviews-all)`.
- **Other**: `get-externalcontacts-externalsource(s)`,
  `get-externalcontacts-reversewhitepageslookup`.

Pagination varies by endpoint: page-number listings (`contacts`, `organizations`,
and their notes/relationships) aggregate all pages into `structuredContent.entities`;
export/import/scan/graph endpoints return a single SDK page as `structuredContent.entity`
(use its `nextUri`/`cursors` for more). The 4 `*-export(s)` tool families (Contacts,
Organizations, Relationships, Notes) require **all** of their listed permissions,
not just one, per Swagger's `"type": "ALL"`.

Two Swagger/SDK gaps were found and are not implemented: `GET /api/v2/externalcontacts/settings`
has no corresponding SDK method, so it was skipped rather than bypassed with a raw
HTTP call; and `get-externalcontacts-contact-journey-segments` omits Swagger's
documented `expand`/`segmentIds` filters because the installed SDK's options type
doesn't expose them.

### Conversations

GET operations on the installed SDK `ConversationsApi` (115 tools, full
coverage), split across two files for maintainability:
[conversations.ts](../src/mcp-functions/conversations.ts) (81 tools - analytics
jobs, conversation/participant details, calls, callbacks, cobrowse sessions,
emails, messages, custom-attribute schemas, settings, video, screenshare,
social) and [conversations-messaging.ts](../src/mcp-functions/conversations-messaging.ts)
(34 tools - the `/api/v2/conversations/messaging/...` sub-resource: Facebook,
Instagram, X/Twitter, WhatsApp, Apple, and Open messaging integrations,
identity resolution, OAuth settings, supported content, and settings).
`gcConversationsRegisterFunctions` remains the single entry point; it calls
`gcConversationsMessagingRegisterFunctions` internally. Call `listTools` for the
authoritative set, since documenting 115 individual input shapes here is
impractical to keep in sync. Grouped by sub-area:

- **Analytics**: `get-analytics-conversation-details`,
  `get-analytics-conversations(-aggregates-job(-results)|-details|-details-job(-results)|-details-jobs-availability)`.
- **Conversation/participant details**: `get-conversation(-accessattributes|
-assistant-copilotcontext|-customattribute(s)|-secureattributes|-suggestion(s)|
-summaries)`, `get-conversation-communication-agentchecklist(s|-job)`,
  `get-conversation-communication-internalmessage(s)`,
  `get-conversation-participant-secureivrsession(s)`,
  `get-conversation-participant-wrapup(codes)`.
- **Calls/callbacks/cobrowse/email/message collections**:
  `get-conversations(-call(s)|-callback(s)|-cobrowsesession(s)|-email(s)|
-message(s)|-internalmessage(s)|-keyconfiguration(s))`, each with matching
  `-participant-communication-wrapup`/`-participant-wrapup(codes)` variants
  where documented, plus `get-conversations-calls-history`,
  `get-conversations-calls-maximumconferenceparties`,
  `get-conversations-email-message(s)(-draft)`, `get-conversations-email-settings`,
  `get-conversations-message-communication-messages-media(-media-id)`,
  `get-conversations-message-details`, `get-conversations-message-message`,
  `get-conversations-messages-cachedmedia(-cached-media-item-id)`.
- **Custom attribute schemas**: `get-conversations-customattributes-schema(-version|
-versions)`, `get-conversations-customattributes-schemas(-coretype|-coretypes|
-limits)`.
- **Settings/video/screenshare/social**: `get-conversations-settings`,
  `get-conversations-video-details`, `get-conversations-videos-meeting`,
  `get-conversations-video-participant-communication-wrapup`,
  `get-conversations-screenshare-participant-communication-wrapup`,
  `get-conversations-social-participant-communication-wrapup`.
- **Messaging integrations**: `get-conversations-messaging-integrations(-apple|
-facebook|-instagram|-open|-twitter|-whatsapp)(-integration-id)`,
  `get-conversations-messaging-integrations-open-extensions-googlebusinessprofile-*`,
  `get-conversations-messaging-facebook-app|-permissions`,
  `get-conversations-messaging-integration-twitter-oauth-settings`,
  `get-conversations-messaging-oauth-apple-callback`.
- **Messaging identity/content/settings**:
  `get-conversations-messaging-identityresolution-integrations-*-integration-id`,
  `get-conversations-messaging-setting(s)(-default)`,
  `get-conversations-messaging-supportedcontent(-default|-supported-content-id)`,
  `get-conversations-messaging-threadingtimeline`.

Pagination varies by endpoint, following the same conventions as the other
domains: page-number endpoints aggregate all pages into `structuredContent.entities`;
cursor/analytics-job endpoints return a single SDK page as `structuredContent.entity`;
listing endpoints whose SDK options expose no page parameters return the
response as-is under its actual field name (e.g. `entities`, `results`, or
`conversations`) rather than inventing pagination the API doesn't support.

Seven methods exist in the installed SDK but have no matching operation in the
public Swagger schema (the SDK is ahead of the published schema here, the
reverse of the Users/`getUserVerifier` gap): `get-conversation-accessattributes`,
`get-conversation-assistant-copilotcontext`, `get-conversations-video-details`,
and the four `get-conversations-messaging-integrations-open-extensions-googlebusinessprofile-*`
tools. Their scopes/permissions are inferred from the installed SDK's typed
options and sibling documented endpoints, and each tool's description says so
explicitly.

When running the compiled server, run `npm run build` after source changes,
restart the server, and reconnect the MCP client to refresh its tool list.
