import { useEffect, useRef } from 'react';

/** Drives a native <dialog> from a piece of React state. */
export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return ref;
}
