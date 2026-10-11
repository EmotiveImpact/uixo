/** A coding client on the Connect page and the one block that adds UIXO to it. */
export type ConnectClient = {
  id: string;
  name: string;
  /** What to do with the block, in one line. */
  how: string;
  language: 'shell' | 'json';
  snippet: (endpoint: string) => string;
};

const mcpServersJson = (endpoint: string) =>
  JSON.stringify({ mcpServers: { uixo: { url: endpoint } } }, null, 2);

/**
 * One block per client. Claude Code takes its own `mcp add` command; the editors take the
 * shared `mcpServers` JSON shape. Check these when a client changes its config format.
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
    how: 'Add this server to your MCP settings in Cursor.',
    language: 'json',
    snippet: mcpServersJson,
  },
  {
    id: 'vs-code',
    name: 'VS Code',
    how: 'Add this server to your MCP settings in VS Code.',
    language: 'json',
    snippet: mcpServersJson,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    how: 'Add this server to your MCP settings in Windsurf.',
    language: 'json',
    snippet: mcpServersJson,
  },
];

/** Each one returns results through `search_assets` on the live catalogue. */
export const TRY_ASKING = [
  'Find a shimmer button on UIXO and give me its install command.',
  'Show me React date pickers from UIXO.',
  'Find a text effect on UIXO that I can use in commercial work.',
];
