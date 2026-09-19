import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({
  description:
    'Read at most twelve candidate summaries, derived stages and recent job status. No publication or source approval is permitted.',
  inputSchema: z.object({}),
  execute: () => registryCall('operations'),
});
