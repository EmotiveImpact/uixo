import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({
  description:
    'Queue one bounded indexing run for an approved provider. This stages findings for human review; it never publishes assets.',
  inputSchema: z.object({ providerId: z.enum(['shadcn', 'lucide', 'heroicons']) }),
  execute: (input) => registryCall('enqueue', input),
});
