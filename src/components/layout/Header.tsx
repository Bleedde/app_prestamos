'use client';

import { Wallet } from 'lucide-react';
import { useLoanStats } from '@/lib/hooks/useLoans';
import { formatCOP } from '@/lib/utils/format';
import { SyncIndicator } from '@/components/shared/SyncIndicator';

export function Header() {
  const { stats, isLoading } = useLoanStats();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Logo y título */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Mi Cartera</h1>
          </div>
          <SyncIndicator />
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Capital
            </p>
            <p className="text-sm font-semibold text-foreground">
              {isLoading ? '...' : formatCOP(stats.totalCapital)}
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Intereses
            </p>
            <p className="text-sm font-semibold text-success">
              {isLoading ? '...' : formatCOP(stats.totalInterestProjected)}
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Vencidos
            </p>
            <p
              className={`text-sm font-semibold ${
                stats.overdueCount > 0 ? 'text-destructive' : 'text-foreground'
              }`}
            >
              {isLoading ? '...' : stats.overdueCount}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
