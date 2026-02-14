'use client';

import Link from 'next/link';
import { ArrowLeft, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLoanStats, useLoans } from '@/lib/hooks/useLoans';
import { formatCOP } from '@/lib/utils/format';

export default function StatsPage() {
  const { stats, isLoading } = useLoanStats();
  const { loans } = useLoans();

  // Top clientes por préstamos activos
  const activeLoans = loans.filter((l) => l.status === 'active');
  const topClients = [...activeLoans]
    .sort((a, b) => b.principal - a.principal)
    .slice(0, 5);

  // Total capital + intereses proyectados
  const totalProjected = stats.totalCapital + stats.totalInterestProjected;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center gap-4 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Estadísticas</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : (
          <>
            {/* Resumen principal */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs">Capital activo</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatCOP(stats.totalCapital)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-xs">Intereses</span>
                  </div>
                  <p className="text-2xl font-bold text-success">
                    {formatCOP(stats.totalInterestProjected)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-xs">Préstamos activos</span>
                  </div>
                  <p className="text-2xl font-bold">{stats.activeCount}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-xs">Vencidos</span>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      stats.overdueCount > 0 ? 'text-destructive' : ''
                    }`}
                  >
                    {stats.overdueCount}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Total proyectado */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">
                  Total a cobrar (Capital + Intereses)
                </p>
                <p className="text-3xl font-bold text-primary">
                  {formatCOP(totalProjected)}
                </p>
              </CardContent>
            </Card>

            {/* Top clientes */}
            {topClients.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Préstamos más grandes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {topClients.map((loan, index) => (
                      <Link
                        key={loan.id}
                        href={`/loans/${loan.id}`}
                        className="flex items-center justify-between rounded-lg bg-muted/50 p-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {index + 1}
                          </span>
                          <span className="font-medium">{loan.client_name}</span>
                        </div>
                        <span className="font-semibold">
                          {formatCOP(loan.principal)}
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completados */}
            {stats.completedCount > 0 && (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Préstamos completados
                  </span>
                  <span className="font-semibold">{stats.completedCount}</span>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
