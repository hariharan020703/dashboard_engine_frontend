/**
 * MCP connection details shown in the "MCP connection" dialog.
 *
 * STATIC FOR NOW - edit the values here to configure it. Nothing in this file
 * is fetched; the dialog reads it as-is. The only per-connection values (the
 * workspace id and the published version) come from the connection itself.
 *
 * Defaults describe the read-side MCP server as it runs locally
 * (Elze-backend/mcp-context-reader: port 8002, streamable HTTP at /mcp).
 * Replace SERVER_URL with its public URL once it is deployed.
 *
 * Never put the real access token here: this file ships in the browser bundle,
 * and the reader's token is shared across every company.
 */
export const MCP_CONFIG = {
  serverUrl: 'http://localhost:8002/mcp',
  transport: 'Streamable HTTP',
  /** Prefix of the server name a client lists it under: `<prefix>-<connection>`. */
  serverNamePrefix: 'context',
  auth: {
    header: 'Authorization',
    format: 'Bearer <MCP access token>',
    source: 'Issued by your platform administrator.',
  },
  tools: [
    { name: 'list_context_objects', description: 'List the facts recorded for this connection, filterable by type.' },
    { name: 'get_context_object', description: 'Read one fact by id or qualified name.' },
    { name: 'search_context_objects', description: 'Semantic search over the facts.' },
    { name: 'query_sql', description: 'Read-only SELECT / WITH over the context store, scoped to the workspace.' },
  ],
} as const

/** `Sales Warehouse` -> `context-sales-warehouse`. */
export function mcpServerName(connectionName: string): string {
  const slug = connectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${MCP_CONFIG.serverNamePrefix}-${slug || 'layer'}`
}

/** The paste-ready `mcpServers` entry for one connection. */
export function mcpClientConfig(connectionName: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        [mcpServerName(connectionName)]: {
          type: 'http',
          url: MCP_CONFIG.serverUrl,
          headers: { [MCP_CONFIG.auth.header]: MCP_CONFIG.auth.format },
        },
      },
    },
    null,
    2
  )
}
