import { defineTool } from 'eve/tools';
import { z } from 'zod';
import { registryCall } from '../../lib/client.ts';
export default defineTool({
  description:
    'Read one exact review revision and its evidence summary. Licence text is withheld from this bounded tool. You cannot publish it.',
  inputSchema: z.object({ id: z.string().uuid() }),
  execute: ({ id }) => registryCall('revision', undefined, { query: { id } }),
});
