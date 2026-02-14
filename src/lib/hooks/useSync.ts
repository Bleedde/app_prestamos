'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncAll, subscribeToChanges } from '@/lib/db/sync';
import { useOnlineStatus } from './useOnlineStatus';

interface SyncState {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

export function useSync() {
  const isOnline = useOnlineStatus();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  const sync = useCallback(async () => {
    if (!isOnline) {
      setSyncState((prev) => ({
        ...prev,
        error: 'Sin conexión a internet',
      }));
      return;
    }

    setSyncState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const result = await syncAll();
      setSyncState({
        isSyncing: false,
        lastSync: new Date(),
        error: result.success ? null : result.message,
      });
    } catch (err) {
      setSyncState((prev) => ({
        ...prev,
        isSyncing: false,
        error: 'Error al sincronizar',
      }));
    }
  }, [isOnline]);

  // Sync inicial al montar
  useEffect(() => {
    if (isOnline) {
      sync();
    }
  }, [isOnline, sync]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!isOnline) return;

    const unsubscribe = subscribeToChanges(() => {
      setSyncState((prev) => ({ ...prev, lastSync: new Date() }));
    });

    return unsubscribe;
  }, [isOnline]);

  return {
    ...syncState,
    isOnline,
    sync,
  };
}
