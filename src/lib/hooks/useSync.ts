'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncAll, subscribeToChanges } from '@/lib/db/sync';
import { useOnlineStatus } from './useOnlineStatus';
import { useAuth } from './useAuth';

interface SyncState {
  isSyncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

export function useSync() {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  const sync = useCallback(async () => {
    if (!isOnline || !user) {
      if (!isOnline) {
        setSyncState((prev) => ({
          ...prev,
          error: 'Sin conexión a internet',
        }));
      }
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
  }, [isOnline, user]);

  // Sync inicial al montar
  useEffect(() => {
    if (isOnline && user) {
      sync();
    }
  }, [isOnline, user, sync]);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!isOnline || !user) return;

    const unsubscribe = subscribeToChanges(() => {
      setSyncState((prev) => ({ ...prev, lastSync: new Date() }));
    }, user.id);

    return unsubscribe;
  }, [isOnline, user]);

  return {
    ...syncState,
    isOnline,
    sync,
  };
}
