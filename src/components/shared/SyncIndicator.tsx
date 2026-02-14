'use client';

import { Cloud, CloudOff, RefreshCw, Loader2 } from 'lucide-react';
import { useSync } from '@/lib/hooks/useSync';
import { cn } from '@/lib/utils';

export function SyncIndicator() {
  const { isOnline, isSyncing, lastSync, sync } = useSync();

  const handleClick = () => {
    if (isOnline && !isSyncing) {
      sync();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isOnline || isSyncing}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors',
        isOnline
          ? 'bg-success/10 text-success hover:bg-success/20'
          : 'bg-warning/10 text-warning cursor-not-allowed'
      )}
    >
      {!isOnline ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          <span>Offline</span>
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Sincronizando...</span>
        </>
      ) : (
        <>
          <Cloud className="h-3.5 w-3.5" />
          <span>Sincronizado</span>
        </>
      )}
    </button>
  );
}
