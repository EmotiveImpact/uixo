// UIXO glue: the provider's conversation-bar-demo reads its agent id from a Next.js
// environment variable at module load, which does not exist outside the provider's site.
// This renders the unchanged ConversationBar inside the same provider and layout as that
// demo. It shows the bar idle; starting a call needs microphone access and an ElevenLabs
// agent, which the sandboxed preview does not have.
import { ConversationProvider } from '@elevenlabs/react';
import { ConversationBar } from '../../vendor/elevenlabs-ui/registry/elevenlabs-ui/ui/conversation-bar';

export default function ConversationBarDemo() {
  return (
    <ConversationProvider>
      <div className="flex min-h-[200px] w-full items-center justify-center">
        <div className="w-full max-w-md">
          <ConversationBar agentId="" />
        </div>
      </div>
    </ConversationProvider>
  );
}
