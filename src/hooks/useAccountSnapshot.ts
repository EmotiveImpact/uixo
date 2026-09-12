import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiResult } from '../lib/api';

export type AccountSyncStatus = 'local' | 'loading' | 'saving' | 'synced' | 'error';
export type AccountSnapshot<T> = { value: T; revision: number };

type Mutation<T> = (current: T) => T;

type Options<T> = {
  userId: string | null;
  ready: boolean;
  loadLocal: () => T;
  saveLocal: (value: T) => boolean;
  emptyLocal: () => T;
  loadOwner: () => string | null;
  saveOwner: (userId: string) => void;
  clearOwner: () => void;
  shouldMergeLocal: (ownerId: string | null, userId: string) => boolean;
  merge: (local: T, remote: T) => T;
  equal: (left: T, right: T) => boolean;
  readRemote: () => Promise<ApiResult<AccountSnapshot<T>>>;
  writeRemote: (value: T, revision: number) => Promise<ApiResult<AccountSnapshot<T>>>;
};

const RETRIES = 4;
const RETRY_DELAY_MS = 200;
const WRITE_DELAY_MS = 300;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reconciles a browser snapshot with an account snapshot without ever writing before
 * the remote baseline is known. Mutations stay queued until a versioned write succeeds.
 */
export function useAccountSnapshot<T>(options: Options<T>) {
  const optionsRef = useRef(options);
  const { ready, userId } = options;

  const [value, setValue] = useState<T>(options.loadLocal);
  const [status, setStatus] = useState<AccountSyncStatus>('local');
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const valueRef = useRef(value);
  const localBaseRef = useRef(value);
  const pendingRef = useRef<Mutation<T>[]>([]);
  const sessionRef = useRef<string | null>(null);
  const userRef = useRef(options.userId);
  const readyRef = useRef(options.ready);
  const revisionRef = useRef(0);
  const syncedRef = useRef(false);
  const inFlightRef = useRef(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const commit = useCallback((next: T) => {
    valueRef.current = next;
    setValue(next);
    return optionsRef.current.saveLocal(next);
  }, []);

  const queueWrite = useCallback((delay = WRITE_DELAY_MS) => {
    if (!syncedRef.current || !userRef.current) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      writeTimerRef.current = null;
      void flushRef.current();
    }, delay);
  }, []);

  const flushWrites = useCallback(async () => {
    const userId = userRef.current;
    if (!userId || !syncedRef.current || inFlightRef.current) return;

    const generation = generationRef.current;
    const snapshot = valueRef.current;
    const operationCount = pendingRef.current.length;
    inFlightRef.current = true;
    if (mountedRef.current) {
      setStatus('saving');
      setError(null);
    }

    const result = await optionsRef.current.writeRemote(snapshot, revisionRef.current);
    inFlightRef.current = false;
    if (!mountedRef.current || generation !== generationRef.current || userId !== userRef.current) {
      return;
    }

    if (result.ok) {
      revisionRef.current = result.data.revision;
      pendingRef.current.splice(0, operationCount);
      let next = result.data.value;
      for (const mutation of pendingRef.current) next = mutation(next);
      commit(next);
      optionsRef.current.saveOwner(userId);
      setStatus('synced');
      setError(null);
      if (!optionsRef.current.equal(next, result.data.value)) queueWrite(0);
      return;
    }

    // A 409 includes the latest server snapshot. Replay local operations over it and
    // immediately try the new revision instead of making the person resolve it by hand.
    if (result.status === 409 && result.data) {
      revisionRef.current = result.data.revision;
      let next = result.data.value;
      for (const mutation of pendingRef.current) next = mutation(next);
      commit(next);
      syncedRef.current = true;
      setStatus('synced');
      if (!optionsRef.current.equal(next, result.data.value)) queueWrite(0);
      return;
    }

    syncedRef.current = false;
    setStatus('error');
    setError(result.error);
  }, [commit, queueWrite]);

  useEffect(() => {
    optionsRef.current = options;
    userRef.current = userId;
    readyRef.current = ready;
    flushRef.current = flushWrites;
  }, [flushWrites, options, ready, userId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const generation = ++generationRef.current;
    syncedRef.current = false;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = null;

    if (!userId) {
      if (optionsRef.current.loadOwner()) {
        pendingRef.current = [];
        localBaseRef.current = optionsRef.current.emptyLocal();
        commit(localBaseRef.current);
        optionsRef.current.clearOwner();
      }
      sessionRef.current = null;
      revisionRef.current = 0;
      setStatus('local');
      setError(null);
      return;
    }

    if (sessionRef.current !== userId) {
      sessionRef.current = userId;
      if (pendingRef.current.length === 0) localBaseRef.current = valueRef.current;
    }

    let live = true;
    setStatus('loading');
    setError(null);

    void (async () => {
      let remote = await optionsRef.current.readRemote();
      for (let attempt = 0; !remote.ok && attempt < RETRIES; attempt += 1) {
        await wait(RETRY_DELAY_MS);
        if (!live) return;
        remote = await optionsRef.current.readRemote();
      }
      if (!live || generation !== generationRef.current) return;
      if (!remote.ok) {
        setStatus('error');
        setError(remote.error);
        return;
      }

      const owner = optionsRef.current.loadOwner();
      let next = optionsRef.current.shouldMergeLocal(owner, userId)
        ? optionsRef.current.merge(localBaseRef.current, remote.data.value)
        : remote.data.value;
      for (const mutation of pendingRef.current) next = mutation(next);

      revisionRef.current = remote.data.revision;
      commit(next);
      optionsRef.current.saveOwner(userId);
      syncedRef.current = true;
      setStatus('synced');
      setError(null);

      if (!optionsRef.current.equal(next, remote.data.value)) {
        queueWrite(0);
      } else {
        pendingRef.current = [];
      }
    })();

    return () => {
      live = false;
    };
  }, [commit, queueWrite, ready, retryKey, userId]);

  const change = useCallback(
    (mutation: Mutation<T>) => {
      const next = mutation(valueRef.current);
      const persisted = commit(next);

      // An unsettled auth request may reveal an existing account a moment later. Keep
      // those clicks as operations so a removal is not turned back into an addition.
      if (userRef.current || !readyRef.current) pendingRef.current.push(mutation);
      if (userRef.current && syncedRef.current) queueWrite();
      return persisted;
    },
    [commit, queueWrite],
  );

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);

  return { value, change, status, error, retry };
}
