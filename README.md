# Genesys Cloud MCP server

This project implements MCP server for communication with Genesys Cloud CC.

## Setup

Requires Node.js 22.18 or newer.

```powershell
npm install
Copy-Item .env.example .env
npm run build
```

Set these variables in `.env` or the process environment:

| Variable                          | Description                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `GENESYSCLOUD_REGION`             | Genesys Cloud hostname (e.g. `mypurecloud.com`, `mypurecloud.ie`) or SDK region key (e.g. `eu_west_1`). |
| `GENESYSCLOUD_OAUTHCLIENT_ID`     | OAuth client ID.                                                                                        |
| `GENESYSCLOUD_OAUTHCLIENT_SECRET` | OAuth client secret; leave empty or unset for browser sign-in.                                          |
| `GENESYSCLOUD_REDIRECT_URI`       | Browser login callback; defaults to `http://localhost:6798/`.                                           |

With a secret, use a Genesys Cloud OAuth client configured for **Client Credentials**
with the roles needed by the APIs you intend to expose.

Without a secret, use a Genesys Cloud OAuth client configured for **Authorization
Code with PKCE**. Register `http://localhost:6798/` as an authorized redirect URI,
or set `GENESYSCLOUD_REDIRECT_URI` to the exact registered loopback HTTP URL with
an explicit port. Start the server on the machine where the browser and callback
are accessible; complete the browser login before the MCP client connects.

Browser tokens are saved in the current user's OS credential store under
`genesys-cloud-mcp`: Windows Credential Manager, macOS Keychain, or Linux Secret
Service (which must be available and unlocked). The cache is separate for each
region and client ID. A saved access token is checked against `/api/v2/users/me`;
when necessary, a saved refresh token is used, or a new browser login is requested.
Expired tokens are refreshed before subsequent Genesys tool calls. Remove the
corresponding credential from your OS credential manager to sign out locally.
Anyone with access to your user account or credential store may be able to use
the cached credentials.

Both authentication methods work with stdio and HTTP. Authentication happens
before either transport starts; failure stops startup. Tokens and secrets are
not printed or returned by MCP tools.

## Transports

```powershell
# Stdio (default)
npm run start:stdio

# Stateless Streamable HTTP at http://127.0.0.1:3000/mcp
npm run start:http

# Run TypeScript directly during development
npm run dev -- --transport=http
```

`MCP_TRANSPORT` selects `stdio` or `http`; `--transport=...` overrides it.
`MCP_HOST` defaults to `127.0.0.1` and `MCP_PORT` to `3000`.
HTTP supports POST requests at `/mcp`; GET and DELETE return 405 because this
boilerplate does not maintain sessions or standalone notification streams.
HTTP has no client authentication: keep it on loopback, or add authentication
and TLS before exposing it to a network.

## MCP client configuration

For stdio clients, invoke Node directly (not npm, whose output can interfere
with the protocol). Replace the path with your checkout's absolute path:

```json
{
  "mcpServers": {
    "genesys-cloud": {
      "command": "node",
      "args": ["C:\\path\\to\\genesys-cloud-mcp\\dist\\index.js"],
      "env": {
        "GENESYSCLOUD_REGION": "${GENESYSCLOUD_REGION}",
        "GENESYSCLOUD_OAUTHCLIENT_ID": "${GENESYSCLOUD_OAUTHCLIENT_ID}",
        "GENESYSCLOUD_OAUTHCLIENT_SECRET": "${GENESYSCLOUD_OAUTHCLIENT_SECRET}"
      }
    }
  }
}
```

Variable interpolation is MCP-client-specific: ensure your client resolves
placeholders, or supplies values using its environment/input mechanism. The
server reads the resulting process environment; MCP does not define a universal
credential-variable mechanism. Direct Node invocation above does not load `.env`;
to load one, add `--env-file=C:\\path\\to\\genesys-cloud-mcp\\.env` before the script path.

For HTTP clients, configure a Streamable HTTP server URL of
`http://127.0.0.1:3000/mcp` while the server is running.

## Tools

The `ping` tool takes no arguments and returns a text content block containing
`pong`. It checks MCP connectivity, not Genesys API availability, and works over
both transports. Server startup still requires successful Genesys authentication.

In MCP Inspector, connect, select **List Tools**, then call `ping` with `{}`.

The `verify_login` tool takes no arguments and verifies the configured authentication.
It performs a fresh Client Credentials login when a secret is configured; browser
authentication validates and reuses a saved token, refreshing or signing in if needed. A successful login
returns `Genesys Cloud login verified successfully.`; failure returns an MCP tool
error (`isError: true`) with a safe message. No credentials or access tokens are
returned or logged. This verifies authentication, not permission for every API.
It works over both transports and uses the same SDK client as server startup.

In MCP Inspector, select **List Tools**, then call `verify_login` with `{}`.
Invalid initial credentials prevent the server from starting, so the tool is
available only after startup succeeds.

The `invalidate_login` tool takes no arguments and clears the SDK login and saved
access/refresh tokens for the configured region and client ID. It works over both
transports and leaves MCP running. Call `verify_login` to authenticate again.
It does not delete configured client IDs/secrets, revoke tokens remotely, sign out
browser cookies, or affect other running server processes. If credential deletion
fails, the tool returns `isError: true`; the local login remains cleared.

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

Page-number listings aggregate all pages into `structuredContent.entities`;
cursor-based endpoints return the SDK page in `structuredContent.entity` so the
response cursor can be used in a later call. Inputs use the published enum values
where the Swagger schema defines them. This convention applies to every domain
below, not only Users.

The following tools expose the remaining GET operations on the installed SDK
`UsersApi`. `*` marks a required input. Tools include the documented OAuth
scopes and explicit Genesys permissions in their descriptions. `—` means the
Swagger operation does not declare a specific permission requirement.

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

When running the compiled server, run `npm run build` after source changes,
restart the server, and reconnect the MCP client to refresh its tool list.

## Development

Source files live in `src`. Add Genesys tools in `src/server.ts`; the authenticated
SDK singleton is available as `platformClient.ApiClient.instance`. This
server exposes connectivity, login verification, and user listing tools.

```powershell
npm run format:check
npm run typecheck
npm test
```

Run `npm run format` to apply standardized formatting with Prettier.
`npm run format:check` exits with a non-zero status if formatting differs; use it
as a CI check. Formatting uses two-space indentation, single quotes in TypeScript,
trailing commas, a 100-character print width, and LF line endings. Generated files,
dependencies, the lockfile, and environment files are excluded.

Tests mock OAuth, the credential store, and browser launch, and exercise both MCP
transports locally; they do not require real credentials or contact Genesys Cloud.

## Running locally

node --watch --env-file-if-exists=.env src/index.ts --transport=http