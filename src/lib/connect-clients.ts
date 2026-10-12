/** A coding client on the Connect page and the one block that adds UIXO to it. */
export type ConnectClient = {
  id: string;
  name: string;
  /** What to do with the block, in one line. */
  how: string;
  language: 'shell' | 'json';
  snippet: (endpoint: string) => string;
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

/**
 * One block per client, in each client's own documented format: Claude Code takes its
 * `mcp add` command, Cursor and Windsurf a `mcpServers` entry (Windsurf names the remote
 * address `serverUrl`) and VS Code a `servers` entry with a transport type. Check these
 * when a client changes its config format.
 */
export const CONNECT_CLIENTS: ConnectClient[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    how: 'Run this in your terminal, inside your project.',
    language: 'shell',
    snippet: (endpoint) => `claude mcp add --transport http uixo ${endpoint}`,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    how: 'Add this to .cursor/mcp.json in your project, or ~/.cursor/mcp.json for every project.',
    language: 'json',
    snippet: (endpoint) => json({ mcpServers: { uixo: { url: endpoint } } }),
  },
  {
    id: 'vs-code',
    name: 'VS Code',
    how: 'Add this to .vscode/mcp.json in your project, then start the server from that file.',
    language: 'json',
    snippet: (endpoint) => json({ servers: { uixo: { type: 'http', url: endpoint } } }),
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    how: 'Add this to ~/.codeium/windsurf/mcp_config.json, then refresh the MCP servers.',
    language: 'json',
    snippet: (endpoint) => json({ mcpServers: { uixo: { serverUrl: endpoint } } }),
  },
];

/** Each one returns results through `search_assets` on the live catalogue. */
export const TRY_ASKING = [
  'Find a shimmer button on UIXO and give me its install command.',
  'Show me React date pickers from UIXO.',
  'Find a text effect on UIXO that I can use in commercial work.',
];
