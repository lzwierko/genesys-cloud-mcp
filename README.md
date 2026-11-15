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
| `GENESYSCLOUD_OAUTHCLIENT_SECRET` | OAuth client secret.                                                                                    |

Use a Genesys Cloud OAuth client configured for the **Client Credentials** grant,
with the roles needed by the APIs you intend to expose. The SDK client is
authenticated before either transport starts. Missing configuration or failed
authentication stops startup; secrets and tokens are not logged.

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
both transports. Server startup still requires valid Genesys credentials.

In MCP Inspector, connect, select **List Tools**, then call `ping` with `{}`.

The `verify_login` tool takes no arguments and performs a fresh Client Credentials
login using the server's configured Genesys credentials. A successful OAuth grant
returns `Genesys Cloud login verified successfully.`; failure returns an MCP tool
error (`isError: true`) with a safe message. No credentials or access tokens are
returned or logged. This verifies authentication, not permission for every API.
It works over both transports and uses the same SDK client as server startup.

In MCP Inspector, select **List Tools**, then call `verify_login` with `{}`.
Startup authentication is unchanged: invalid initial credentials prevent the
server from starting, so the tool is available only after startup succeeds.

The `get-users` tool returns users from all pages as an `entities` array in MCP
`structuredContent`. It requires the appropriate Genesys Cloud permissions.

The `get-user-by-id` tool accepts a user UUID and optional `expand` fields, and
returns the user in `structuredContent.entity`.

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

Tests mock OAuth authentication and exercise both MCP transports locally;
they do not require real credentials or contact Genesys Cloud.
