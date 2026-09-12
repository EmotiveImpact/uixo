import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({ description: 'Read at most twelve pending revisions and licence evidence summaries. You cannot approve or reject them.', inputSchema: z.object({}), execute: () => registryCall('queue') });
