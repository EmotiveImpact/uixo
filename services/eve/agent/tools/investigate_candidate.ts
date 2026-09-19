import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({
  description:
    'Queue one investigation for a candidate already linked by a curator to an approved provider. Pass the revision from inspect_candidate. Never invent provider approval.',
  inputSchema: z.object({
    id: z.string().uuid(),
    expectedRevision: z.number().int().nonnegative(),
    afterJobId: z.string().uuid().optional(),
  }),
  execute: (input) => registryCall('candidate-investigate', input),
});
