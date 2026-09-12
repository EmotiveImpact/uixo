import { LayoutDashboard, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { User } from '../lib/auth';

type AccountMenuProps = {
  /** When false, accounts are not on offer and nothing is rendered. */
  available: boolean;
  /** Until the session request settles, do not flash the signed-out button. */
  settled?: boolean;
  user: User | null;
  onSignIn: () => void;
  onDashboard: () => void;
  onAdmin?: () => void;
  onSignOut: () => void;
  dashboardHref: string;
  adminHref?: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function AccountMenu({
  available,
  settled = true,
  user,
  onSignIn,
  onDashboard,
  onAdmin,
  onSignOut,
  dashboardHref,
  adminHref = '/admin',
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!available) return null;

  if (!user) {
    if (!settled) {
      return <span className="signin-button" aria-busy="true" aria-label="Checking sign-in" />;
    }
    return (
      <button className="signin-button" onClick={onSignIn}>
        <UserIcon size={16} className="signin-icon" />
        <span className="signin-label">Sign in</span>
      </button>
    );
  }

  return (
    <div className="account" ref={wrapRef}>
      <button
        className="avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((current) => !current)}
      >
        {initials(user.name)}
      </button>

      {open && (
        <div className="account-menu" role="menu">
          <div className="account-identity">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
            {user.role === 'curator' && <span className="role-badge">Curator</span>}
          </div>
          <a
            role="menuitem"
            href={dashboardHref}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey) return;
              event.preventDefault();
              setOpen(false);
              onDashboard();
            }}
          >
            <LayoutDashboard size={15} /> Dashboard
          </a>
          {user.role === 'curator' && onAdmin && (
            <a
              role="menuitem"
              href={adminHref}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                setOpen(false);
                onAdmin();
              }}
            >
              <ShieldCheck size={15} /> Admin workspace
            </a>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
