import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createRegistryMcp } from './mcp.ts';
import { getRegistry } from './runtime.ts';
// No application logs on stdout: it belongs exclusively to the MCP transport.
const registry = await getRegistry();
serveStdio(() => createRegistryMcp(registry));
