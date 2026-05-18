'use client';

import { useEffect } from 'react';
import { useSession } from './sessionStore';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export interface AutoCleanupOptions {
  redirectTo?: string | null;
  idleTimeoutMs?: number;
}

export function useAutoCleanup(opts: AutoCleanupOptions = {}): void {
  const purge = useSession((s) => s.purge);
  const idleMs = opts.idleTimeoutMs ?? IDLE_TIMEOUT_MS;
  const redirectTo = opts.redirectTo ?? '/';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let teardownInProgress = false;

    const purgeEverything = (redirect: boolean): void => {
      purge();
      try {
        localStorage.clear();
      } catch {
        /* private mode etc. */
      }
      try {
        sessionStorage.clear();
      } catch {
        /* private mode etc. */
      }
      if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
        indexedDB
          .databases()
          .then((dbs) => {
            for (const db of dbs) {
              if (db.name) indexedDB.deleteDatabase(db.name);
            }
          })
          .catch(() => {});
      }
      if (typeof caches !== 'undefined') {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
      if (redirect && redirectTo) {
        window.location.href = redirectTo;
      }
    };

    const onIdle = (): void => purgeEverything(true);
    const onUnload = (): void => purgeEverything(false);

    const resetTimer = (): void => {
      if (teardownInProgress) return;
      clearTimeout(timer);
      timer = setTimeout(onIdle, idleMs);
    };

    for (const e of ACTIVITY_EVENTS) {
      document.addEventListener(e, resetTimer, { passive: true });
    }
    window.addEventListener('beforeunload', onUnload);
    resetTimer();

    return () => {
      teardownInProgress = true;
      clearTimeout(timer);
      for (const e of ACTIVITY_EVENTS) document.removeEventListener(e, resetTimer);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [purge, redirectTo, idleMs]);
}
