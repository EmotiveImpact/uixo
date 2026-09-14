import { X } from 'lucide-react';
import type { RefObject } from 'react';
import { SignInDialog } from './SignInDialog';
import { SubmitPanel } from './SubmitPanel';
import type { ModalName } from '../types';
import type { AuthResult, SocialProvider } from '../lib/auth';

type AppDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  modal: ModalName | null;
  onClose: () => void;
  userId: string | null;
  onSignIn: (email: string, password: string) => Promise<AuthResult>;
  onSignUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  onProvider: (provider: SocialProvider) => Promise<AuthResult>;
  onAuthDone: () => void;
};

/**
 * A click on <dialog> itself lands on the backdrop, but the event target is the
 * dialog either way — so compare against its box to tell the two apart.
 */
function isBackdropClick(event: React.MouseEvent<HTMLDialogElement>, dialog: HTMLDialogElement) {
  if (event.target !== dialog) return false;
  const box = dialog.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

export function AppDialog({
  dialogRef,
  modal,
  onClose,
  userId,
  onSignIn,
  onSignUp,
  onProvider,
  onAuthDone,
}: AppDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className={modal === 'submit' ? 'dialog-submit' : undefined}
      aria-labelledby={modal === 'submit' ? 'dialog-title' : undefined}
      onCancel={onClose}
      onClick={(event) => {
        const dialog = dialogRef.current;
        if (dialog && isBackdropClick(event, dialog)) onClose();
      }}
    >
      <button className="dialog-close utility" onClick={onClose} aria-label="Close dialog">
        <X size={17} />
      </button>

      {modal === 'about' && (
        <>
          <h2>
            Good tools.
            <br />
            Great interfaces.
          </h2>
          <p>UIXO is a small, curated list of websites for people who design and build.</p>
          <p>
            Every listing is chosen by hand and checked by hand. Featured means we reach for it, not
            that it is popular.
          </p>
          <p>Sign in and your lists travel with the account, not this browser.</p>
        </>
      )}

      {modal === 'submit' && <SubmitPanel userId={userId} />}

      {modal === 'signin' && (
        <SignInDialog
          onSignIn={onSignIn}
          onSignUp={onSignUp}
          onProvider={onProvider}
          onDone={onAuthDone}
        />
      )}
    </dialog>
  );
}
