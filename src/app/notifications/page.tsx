'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOverdueLoans, useUpcomingDueLoans } from '@/lib/hooks/useLoans';
import { formatCOP, formatDaysUntilDue } from '@/lib/utils/format';

export default function NotificationsPage() {
  const { loans: overdueLoans, isLoading: loadingOverdue } = useOverdueLoans();
  const { loans: upcomingLoans, isLoading: loadingUpcoming } =
    useUpcomingDueLoans(7);

  const isLoading = loadingOverdue || loadingUpcoming;
  const hasNotifications = overdueLoans.length > 0 || upcomingLoans.length > 0;

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
          <h1 className="text-lg font-semibold">Notificaciones</h1>
          {hasNotifications && (
            <Badge variant="destructive" className="ml-auto">
              {overdueLoans.length + upcomingLoans.length}
            </Badge>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : !hasNotifications ? (
          // Estado vacío
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="mb-1 text-lg font-medium">Todo al día</h3>
            <p className="text-sm text-muted-foreground">
              No hay préstamos vencidos ni próximos a vencer
            </p>
          </div>
        ) : (
          <>
            {/* Préstamos vencidos */}
            {overdueLoans.length > 0 && (
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Vencidos ({overdueLoans.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {overdueLoans.map((loan) => (
                      <Link
                        key={loan.id}
                        href={`/loans/${loan.id}`}
                        className="flex items-center justify-between rounded-lg bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                      >
                        <div>
                          <p className="font-medium">{loan.client_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDaysUntilDue(loan.days_until_due)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-destructive">
                            {formatCOP(loan.total_owed)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            15% interés
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Próximos a vencer */}
            {upcomingLoans.length > 0 && (
              <Card className="border-warning/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
                    <Clock className="h-4 w-4" />
                    Próximos a vencer ({upcomingLoans.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {upcomingLoans.map((loan) => (
                      <Link
                        key={loan.id}
                        href={`/loans/${loan.id}`}
                        className="flex items-center justify-between rounded-lg bg-warning/5 p-3 transition-colors hover:bg-warning/10"
                      >
                        <div>
                          <p className="font-medium">{loan.client_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDaysUntilDue(loan.days_until_due)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCOP(loan.total_owed)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            10% interés
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
