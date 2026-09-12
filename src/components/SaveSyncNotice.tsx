import type { AccountSyncStatus } from '../hooks/useAccountSnapshot';

type Props = {
  label: string;
  status: AccountSyncStatus;
  error: string | null;
  onRetry: () => void;
};

/** Quiet during normal operation; actionable only when an account sync fails. */
export function SaveSyncNotice({ label, status, error, onRetry }: Props) {
  if (status !== 'error') return null;
  return (
    <section className="save-sync-notice" role="alert">
      <p>
        <strong>{label} are safe in this browser.</strong>{' '}
        {error || 'They could not be synced to your account.'}
      </p>
      <button type="button" onClick={onRetry}>
        Retry sync
      </button>
    </section>
  );
}
