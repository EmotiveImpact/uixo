import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({ description: 'Execute a previously queued indexing job once. The backend applies a lease, bounded requests and asset limits; output remains unpublished until a curator reviews it.', inputSchema: z.object({ id: z.string().uuid() }), execute: (input) => registryCall('run', input) });
