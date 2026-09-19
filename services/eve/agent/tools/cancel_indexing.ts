import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({
  description:
    'Cancel one active job when requested. This does not reject or publish any asset revision. Provide an auditable reason.',
  inputSchema: z.object({ id: z.string().uuid(), reason: z.string().min(10).max(2000) }),
  execute: (input) => registryCall('cancel', input),
});
