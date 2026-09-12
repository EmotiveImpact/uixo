import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({ description: 'Inspect recent indexing runs before queuing work. Respect delayed retry and active lease states.', inputSchema: z.object({}), execute: () => registryCall('jobs') });
