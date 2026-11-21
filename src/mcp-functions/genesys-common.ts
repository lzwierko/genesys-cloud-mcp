import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type PagingParams = { pageSize: number; pageNumber: number };

export async function getPagedResponse<T, P extends object>(
  apiMethod: (params: P & PagingParams) => Promise<{ entities?: T[] }>,
  initialParams?: P & PagingParams,
): Promise<T[]> {
  const pageSize = initialParams?.pageSize ?? 100;
  let pageNumber = initialParams?.pageNumber ?? 1;

  if (!initialParams) {
    initialParams = {} as P & PagingParams;
  }

  const allResults: T[] = [];
  while (true) {
    const response = await apiMethod({ ...initialParams, pageSize, pageNumber });
    if (!Array.isArray(response.entities)) {
      throw new Error('Genesys Cloud paged response is missing its entities array.');
    }
    allResults.push(...response.entities);
    if (response.entities.length < pageSize) break;
    pageNumber++;
  }
  return allResults;
}

// Builds a Genesys SDK options object, omitting keys whose value is undefined. The SDK treats a
// present `undefined` value differently from an absent key for some optional query parameters.
export function option<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  const result: Partial<Record<K, V>> = {};
  if (value !== undefined) result[key] = value;
  return result;
}

export function createExpandEnumSchema<const T extends readonly [string, ...string[]]>(
  values: T,
  description: string,
) {
  return z.array(z.enum(values)).optional().describe(description);
}

const genesysErrorBodySchema = z.object({
  status: z.number().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  contextId: z.string().optional(),
});

// The SDK rejects with the parsed Genesys Cloud ErrorBody (status/code/message/contextId) when the
// API responds with an error, or with the underlying HTTP/network error otherwise. Both are safe to
// log: they never contain the OAuth token, since the SDK only attaches it to the request headers.
export function describeGenesysError(error: unknown): string {
  const body = genesysErrorBodySchema.safeParse(error);
  if (body.success && (body.data.status ?? body.data.code ?? body.data.message)) {
    const { status, code, message, contextId } = body.data;
    return [
      status !== undefined ? `HTTP ${status}` : '',
      code,
      message,
      contextId ? `(contextId: ${contextId})` : '',
    ]
      .filter(Boolean)
      .join(' - ');
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

// Registers a GET-only Genesys Cloud API operation as an MCP tool, shared across every domain
// module (UsersApi, RoutingApi, PresenceApi, ...). `apiLabel` is the SDK class name, used only to
// make server-side error logs identify the failing API and method (e.g. "RoutingApi.getRoutingQueues").
export function registerApiGetTool<Api, S extends z.ZodType>(
  server: McpServer,
  apiLabel: string,
  getApi: () => Promise<Api>,
  methodName: string,
  title: string,
  summary: string,
  scopes: string[],
  permissions: string[],
  inputSchema: S,
  execute: (api: Api, input: z.output<S>) => Promise<Record<string, unknown>>,
  toolName = methodName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
) {
  const requirements = [
    scopes.length ? `OAuth scopes: ${scopes.join(', ')}.` : '',
    permissions.length
      ? permissions.length > 1
        ? `Requires at least one of these permissions: ${permissions.join(', ')}.`
        : `Requires permission: ${permissions[0]}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handler = async (input: z.output<S>): Promise<CallToolResult> => {
    try {
      return {
        content: [],
        structuredContent: await execute(await getApi(), input),
      };
    } catch (error) {
      const subject = title.replace(/^Get /, '').toLowerCase();
      const message = `Failed to retrieve Genesys Cloud ${subject}.`;
      console.error(`${message} ${apiLabel}.${methodName}: ${describeGenesysError(error)}`);
      return {
        isError: true,
        content: [{ type: 'text', text: message }],
      };
    }
  };

  server.registerTool(
    toolName,
    {
      title,
      description: `${summary} Returns the SDK response as structured JSON. ${requirements}`.trim(),
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    // Keep the concrete Zod input type above; the MCP callback generic is conditional and loses it here.
    handler as ToolCallback<S>,
  );
}
