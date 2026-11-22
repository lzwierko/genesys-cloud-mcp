# Genesys Cloud MCP server

This project implements MCP server for communication with Genesys Cloud CC.

## License

This project is licensed under the [MIT License](LICENSE).

## Install from npm

Requires Node.js 22.18 or newer. Install the published package globally to use
the `genesys-cloud-mcp` command:

```powershell
npm install --global genesys-cloud-mcp
genesys-cloud-mcp
```

Set the required `GENESYSCLOUD_REGION` and `GENESYSCLOUD_OAUTHCLIENT_ID`
environment variables, plus `GENESYSCLOUD_OAUTHCLIENT_SECRET` for Client
Credentials authentication. See the [configuration](#setup) section for browser
authentication and all supported settings.

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
| `GENESYSCLOUD_PERSIST_TOKENS`     | Set to `true` to keep browser tokens in the OS credential store; defaults to `false`.                 |

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

Set `GENESYSCLOUD_PERSIST_TOKENS=false` to opt out of saving browser access and
refresh tokens. They remain in process memory for the current server run, so
browser sign-in is required again the next time the server starts. This setting
does not affect Client Credentials authentication. The server does not save the
OAuth client secret: for MCPB installs Claude Desktop stores the sensitive
secret setting in its OS credential store; other MCP clients manage their
configured environment variables themselves. If you already have saved browser
tokens, use `invalidate_login` or remove them from the OS credential store 
(it does not remove it from browser cache though).

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
`MCP_TOOL_ACCESS` accepts `read`, `write`, or `all` (default), on both transports.
Read tools are available in every mode. Currently, all Genesys API tools are
read-only, so all modes expose the same tools; the setting is reserved for gating
future write tools. Login controls remain available in every mode, even though
they can change local authentication state. Tool annotations identify these
side effects independently of the access mode.
Authentication still happens at startup in every mode; this setting does not
change Genesys permissions or token refresh.
HTTP supports POST requests at `/mcp`; GET and DELETE return 405 because this
boilerplate does not maintain sessions or standalone notification streams.
HTTP has no client authentication: keep it on loopback, or add authentication
and TLS before exposing it to a network.

## MCP client configuration

The server uses the standard MCP protocol and works with Claude Desktop and
Claude Code over stdio. Install the package globally first:

```powershell
npm install --global genesys-cloud-mcp
```

### Claude Desktop

In Claude Desktop, open **Settings > Developer > Edit Config** and add the
following to `claude_desktop_config.json`. Replace the region and client ID
with your Genesys Cloud settings. This example omits the OAuth client secret
and uses browser sign-in (Authorization Code with PKCE); see [Setup](#setup)
for the required redirect URI and authentication details.

```json
{
  "mcpServers": {
    "genesys-cloud": {
      "command": "cmd",
      "args": ["/c", "genesys-cloud-mcp"],
      "env": {
        "GENESYSCLOUD_REGION": "mypurecloud.com",
        "GENESYSCLOUD_OAUTHCLIENT_ID": "YOUR_CLIENT_ID"
      }
    }
  }
}
```

Save the file and restart Claude Desktop. On startup, the server opens your
browser for Genesys Cloud sign-in.

### Claude Code

Run this in PowerShell after installing the package globally. Replace the
region and client ID with your Genesys Cloud settings:

```powershell
claude mcp add --scope user `
  --env GENESYSCLOUD_REGION=mypurecloud.com GENESYSCLOUD_OAUTHCLIENT_ID=YOUR_CLIENT_ID `
  --transport stdio `
  genesys-cloud -- cmd /c genesys-cloud-mcp
```

This configures browser sign-in (Authorization Code with PKCE). Start or
restart Claude Code; the server will open your browser for Genesys Cloud
sign-in. Use `claude mcp get genesys-cloud` to check the configuration.

For an npm installation, use the installed command (not `npm`, whose output can
interfere with the protocol):

```json
{
  "mcpServers": {
    "genesys-cloud": {
      "command": "genesys-cloud-mcp",
      "env": {
        "GENESYSCLOUD_REGION": "${GENESYSCLOUD_REGION}",
        "GENESYSCLOUD_OAUTHCLIENT_ID": "${GENESYSCLOUD_OAUTHCLIENT_ID}",
        "GENESYSCLOUD_OAUTHCLIENT_SECRET": "${GENESYSCLOUD_OAUTHCLIENT_SECRET}"
      }
    }
  }
}
```

For a local checkout, invoke Node directly and replace the path with your
checkout's absolute path:

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

To select read access, add `"MCP_TOOL_ACCESS": "read"` to the client's
`env` object. For HTTP, set it in the server process environment before startup;
the setting applies to all clients of that process.

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

### Genesys API tools

Beyond the three control tools above, the server exposes read-only (`GET`) MCP
tools for several Genesys Cloud API domains:

| Domain                            | SDK class             | Tools |
| --------------------------------- | --------------------- | ----- |
| Users                             | `UsersApi`            | 57    |
| Presence                          | `PresenceApi`         | 13    |
| Organization                      | `OrganizationApi`     | 13    |
| Objects (authorization divisions) | `ObjectsApi`          | 6     |
| License                           | `LicenseApi`          | 5     |
| Groups                            | `GroupsApi`           | 9     |
| External Contacts                 | `ExternalContactsApi` | 65    |
| Conversations                     | `ConversationsApi`    | 115   |

All of them follow the same shape: each tool mirrors one SDK method, returns
the SDK response as MCP `structuredContent` (`entity` for a single object,
`entities` for a list), and documents its required OAuth scopes/permissions in
its MCP description. For the full per-tool catalog, including input shapes,
pagination behavior, and documented SDK/Swagger mismatches, see
[AGENTS.md](./AGENTS.md); for the authoritative live list, call `listTools`
from any MCP client.

## Development

Source files live in `src`. Add Genesys tools in `src/mcp-functions`, following
the conventions documented in [AGENTS.md](./AGENTS.md); the authenticated SDK
singleton is available via `getGenesysClient()`. Wire a new domain module into
[src/server.ts](./src/server.ts) so its tools are registered on startup.

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

## Packaging and publishing

Update the version in `package.json` for each release. Create one universal
MCPB for Windows and macOS with:

```powershell
npm install
npm run pack:mcpb
```

The bundle is written to `release/genesys-cloud-mcp-<version>.mcpb`. It includes
the native keyring modules for Windows x64/ARM64 and macOS x64/ARM64.

The pack command installs production dependencies for each supported target,
validates the MCPB manifest, and bundles the built server. Claude Desktop asks
for the Genesys Cloud region, OAuth client ID, and whether to remember browser
sign-in when the extension is installed. Disable **Remember browser sign-in**
to keep browser tokens in memory only. The optional client secret is stored as
a sensitive setting; leave it blank to use browser sign-in with Authorization
Code and PKCE.
When the optional client secret is blank, the server also accepts Claude
Desktop's unresolved `${user_config.oauth_client_secret}` placeholder as empty.

Attach the matching `.mcpb` file to the GitHub release. Users can open the
downloaded file in Claude Desktop to install it. Bundles are unsigned; sign
them with a trusted code-signing certificate if your distribution requires it.
To publish the npm package as well, verify its contents and publish separately:

```powershell
npm pack --dry-run
npm publish
```

The npm `prepack` script builds the project, and the `files` field in
`package.json` limits the npm package contents. Each npm version can only be
published once, so choose a new version for every release.

## Running locally

node --watch --env-file-if-exists=.env src/index.ts --transport=http
