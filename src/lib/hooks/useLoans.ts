'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { enrichLoanWithCalculations } from '@/lib/utils/interest';
import { useAuth } from '@/lib/hooks/useAuth';
import type { LoanStatus } from '@/types';
import { DAYS_DUE_SOON_THRESHOLD } from '@/lib/constants';

/**
 * Hook para obtener todos los préstamos con cálculos en tiempo real
 */
export function useLoans() {
  const { user } = useAuth();
  const loans = useLiveQuery(async () => {
    if (!user) return [];
    const allLoans = await db.loans.where('user_id').equals(user.id).toArray();
    return allLoans.map((loan) => enrichLoanWithCalculations(loan));
  }, [user?.id]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener préstamos filtrados por estado
 */
export function useLoansByStatus(status: LoanStatus) {
  const { user } = useAuth();
  const loans = useLiveQuery(async () => {
    if (!user) return [];
    const filteredLoans = await db.loans
      .where('[user_id+status]')
      .equals([user.id, status])
      .toArray();
    return filteredLoans.map((loan) => enrichLoanWithCalculations(loan));
  }, [user?.id, status]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener préstamos activos
 */
export function useActiveLoans() {
  return useLoansByStatus('active');
}

/**
 * Hook para obtener un préstamo por ID
 */
export function useLoan(id: string | null) {
  const { user } = useAuth();
  const loan = useLiveQuery(async () => {
    if (!id || !user) return null;
    const foundLoan = await db.loans.get(id);
    if (!foundLoan || foundLoan.user_id !== user.id) return null;
    return enrichLoanWithCalculations(foundLoan);
  }, [id, user?.id]);

  return {
    loan: loan ?? null,
    isLoading: loan === undefined,
  };
}

/**
 * Hook para buscar préstamos por nombre
 */
export function useSearchLoans(searchTerm: string) {
  const { user } = useAuth();
  const loans = useLiveQuery(async () => {
    if (!user) return [];
    const term = searchTerm.toLowerCase().trim();
    const userLoans = await db.loans.where('user_id').equals(user.id).toArray();
    const results = term
      ? userLoans.filter((loan) => loan.client_name.toLowerCase().includes(term))
      : userLoans;

    return results.map((loan) => enrichLoanWithCalculations(loan));
  }, [searchTerm, user?.id]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener estadísticas de préstamos
 */
export function useLoanStats() {
  const { user } = useAuth();
  const stats = useLiveQuery(async () => {
    if (!user) return null;
    const allLoans = await db.loans.where('user_id').equals(user.id).toArray();
    const enrichedLoans = allLoans.map((loan) =>
      enrichLoanWithCalculations(loan)
    );

    const activeLoans = enrichedLoans.filter((l) => l.status === 'active');
    const overdueLoans = activeLoans.filter((l) => l.is_overdue);

    return {
      totalCapital: activeLoans.reduce((sum, l) => sum + l.principal, 0),
      totalInterestProjected: activeLoans.reduce(
        (sum, l) => sum + l.current_interest,
        0
      ),
      activeCount: activeLoans.length,
      overdueCount: overdueLoans.length,
      completedCount: enrichedLoans.filter((l) => l.status === 'completed').length,
    };
  }, [user?.id]);

  return {
    stats: stats ?? {
      totalCapital: 0,
      totalInterestProjected: 0,
      activeCount: 0,
      overdueCount: 0,
      completedCount: 0,
    },
    isLoading: stats === undefined,
  };
}

/**
 * Hook para obtener préstamos próximos a vencer
 */
export function useUpcomingDueLoans(daysThreshold = DAYS_DUE_SOON_THRESHOLD) {
  const { user } = useAuth();
  const loans = useLiveQuery(async () => {
    if (!user) return [];
    const activeLoans = await db.loans
      .where('[user_id+status]')
      .equals([user.id, 'active'])
      .toArray();

    return activeLoans
      .map((loan) => enrichLoanWithCalculations(loan))
      .filter(
        (loan) =>
          loan.days_until_due > 0 && loan.days_until_due <= daysThreshold
      )
      .sort((a, b) => a.days_until_due - b.days_until_due);
  }, [daysThreshold, user?.id]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener préstamos vencidos
 */
export function useOverdueLoans() {
  const { user } = useAuth();
  const loans = useLiveQuery(async () => {
    if (!user) return [];
    const activeLoans = await db.loans
      .where('[user_id+status]')
      .equals([user.id, 'active'])
      .toArray();

    return activeLoans
      .map((loan) => enrichLoanWithCalculations(loan))
      .filter((loan) => loan.is_overdue)
      .sort((a, b) => b.days_elapsed - a.days_elapsed);
  }, [user?.id]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}
