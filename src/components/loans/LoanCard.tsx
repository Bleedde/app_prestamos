'use client';

import Link from 'next/link';
import { User, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  formatCOP,
  formatDateShort,
  formatDaysUntilDue,
} from '@/lib/utils/format';
import { formatInterestRate } from '@/lib/utils/interest';
import type { LoanWithCalculations } from '@/types';
import { cn } from '@/lib/utils';

interface LoanCardProps {
  loan: LoanWithCalculations;
}

export function LoanCard({ loan }: LoanCardProps) {
  // Calcular progreso (días / 30)
  const progress = Math.min((loan.days_elapsed / 30) * 100, 100);

  // Determinar estado visual
  const getStatusBadge = () => {
    if (loan.status === 'completed') {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Completado
        </Badge>
      );
    }
    if (loan.is_overdue) {
      return (
        <Badge variant="destructive">
          Vencido
        </Badge>
      );
    }
    if (loan.days_until_due <= 3) {
      return (
        <Badge className="bg-warning text-warning-foreground">
          Por vencer
        </Badge>
      );
    }
    return (
      <Badge className="bg-success/10 text-success border-success/20">
        Al día
      </Badge>
    );
  };

  // Color del progress bar según estado
  const getProgressColor = () => {
    if (loan.is_overdue) return 'bg-destructive';
    if (loan.days_until_due <= 3) return 'bg-warning';
    return 'bg-primary';
  };

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link href={`/loans/${loan.id}`}>
      <Card className="transition-all hover:bg-accent/50 active:scale-[0.98]">
        <CardContent className="p-4">
          {/* Header: Avatar, nombre, badge */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-border">
                <AvatarImage src={loan.photo_url} alt={loan.client_name} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(loan.client_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium leading-tight">{loan.client_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatCOP(loan.principal)} • {formatInterestRate(loan.current_interest_rate)}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Día {loan.days_elapsed} de 30</span>
              <span>{formatDaysUntilDue(loan.days_until_due)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn('h-full transition-all', getProgressColor())}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Footer: Total adeudado y fecha */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-foreground">
                {formatCOP(loan.total_owed)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>Vence {formatDateShort(loan.due_date)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
