import { useRegistryData } from '../hooks/useRegistryData';

type Status = {
  readOnly: boolean;
  intelligence?: { ready: boolean; mode: string; migration: string };
};

export function RegistryReadiness() {
  const remote = useRegistryData<Status>('status');
  if (!remote.data) return null;
  if (remote.data.intelligence && !remote.data.intelligence.ready)
    return (
      <aside className="dv2-inline-state" role="status">
        <p>
          Registry setup is incomplete. Collections and editorial tools need the additive
          intelligence migration. Existing asset browsing can still be used.
        </p>
      </aside>
    );
  if (remote.data.readOnly)
    return (
      <p className="dv2-evidence-footnote" role="status">
        Read-only evaluation catalogue. These are retained source records and release selections,
        not a live indexing run. Editorial writes require a persistent registry.
      </p>
    );
  return null;
}
