'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/dexie';
import { enrichLoanWithCalculations } from '@/lib/utils/interest';
import type { LoanWithCalculations, LoanStatus } from '@/types';

/**
 * Hook para obtener todos los préstamos con cálculos en tiempo real
 */
export function useLoans() {
  const loans = useLiveQuery(async () => {
    const allLoans = await db.loans.toArray();
    return allLoans.map((loan) => enrichLoanWithCalculations(loan));
  }, []);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener préstamos filtrados por estado
 */
export function useLoansByStatus(status: LoanStatus) {
  const loans = useLiveQuery(async () => {
    const filteredLoans = await db.loans
      .where('status')
      .equals(status)
      .toArray();
    return filteredLoans.map((loan) => enrichLoanWithCalculations(loan));
  }, [status]);

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
  const loan = useLiveQuery(async () => {
    if (!id) return null;
    const foundLoan = await db.loans.get(id);
    if (!foundLoan) return null;
    return enrichLoanWithCalculations(foundLoan);
  }, [id]);

  return {
    loan: loan ?? null,
    isLoading: loan === undefined,
  };
}

/**
 * Hook para buscar préstamos por nombre
 */
export function useSearchLoans(searchTerm: string) {
  const loans = useLiveQuery(async () => {
    const term = searchTerm.toLowerCase().trim();
    let results;

    if (!term) {
      results = await db.loans.toArray();
    } else {
      results = await db.loans
        .filter((loan) => loan.client_name.toLowerCase().includes(term))
        .toArray();
    }

    return results.map((loan) => enrichLoanWithCalculations(loan));
  }, [searchTerm]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener estadísticas de préstamos
 */
export function useLoanStats() {
  const stats = useLiveQuery(async () => {
    const allLoans = await db.loans.toArray();
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
  }, []);

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
export function useUpcomingDueLoans(daysThreshold = 7) {
  const loans = useLiveQuery(async () => {
    const activeLoans = await db.loans
      .where('status')
      .equals('active')
      .toArray();

    return activeLoans
      .map((loan) => enrichLoanWithCalculations(loan))
      .filter(
        (loan) =>
          loan.days_until_due > 0 && loan.days_until_due <= daysThreshold
      )
      .sort((a, b) => a.days_until_due - b.days_until_due);
  }, [daysThreshold]);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}

/**
 * Hook para obtener préstamos vencidos
 */
export function useOverdueLoans() {
  const loans = useLiveQuery(async () => {
    const activeLoans = await db.loans
      .where('status')
      .equals('active')
      .toArray();

    return activeLoans
      .map((loan) => enrichLoanWithCalculations(loan))
      .filter((loan) => loan.is_overdue)
      .sort((a, b) => b.days_elapsed - a.days_elapsed);
  }, []);

  return {
    loans: loans ?? [],
    isLoading: loans === undefined,
  };
}
