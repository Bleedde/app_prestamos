import { differenceInDays, addMonths, parseISO } from 'date-fns';
import type { Loan, LoanWithCalculations } from '@/types';

/**
 * LÓGICA DE INTERESES
 *
 * - Primeras 2 semanas (días 0-14): 10% sobre el capital
 * - Después de 2 semanas (día 15+): 15% sobre el capital
 * - Vencimiento: el mismo día del mes siguiente
 *
 * El interés siempre se calcula sobre el capital original,
 * nunca sobre intereses acumulados (no hay interés compuesto).
 */

const RATE_NORMAL = 0.10; // 10% primeras 2 semanas
const RATE_OVERDUE = 0.15; // 15% después de 2 semanas
const DAYS_THRESHOLD = 14; // 2 semanas

/**
 * Obtiene la tasa de interés basada en los días transcurridos
 */
export function getInterestRate(days: number): number {
  if (days <= DAYS_THRESHOLD) {
    return RATE_NORMAL;
  }
  return RATE_OVERDUE;
}

/**
 * Calcula los días transcurridos desde una fecha
 */
export function getDaysElapsed(startDate: string, currentDate?: Date): number {
  const start = parseISO(startDate);
  const now = currentDate || new Date();
  const days = differenceInDays(now, start);
  return Math.max(0, days);
}

/**
 * Calcula el interés actual basado en el capital y días transcurridos
 */
export function calculateInterest(principal: number, days: number): number {
  const rate = getInterestRate(days);
  return principal * rate;
}

/**
 * Calcula el total adeudado (capital + intereses)
 */
export function calculateTotalOwed(principal: number, days: number): number {
  return principal + calculateInterest(principal, days);
}

/**
 * Calcula la fecha de vencimiento (mismo día del mes siguiente)
 * Ej: 14 enero -> 14 febrero, 31 enero -> 28 febrero
 */
export function calculateDueDate(cycleStartDate: string): string {
  const start = parseISO(cycleStartDate);
  const dueDate = addMonths(start, 1);
  return dueDate.toISOString();
}

/**
 * Calcula los días hasta el vencimiento
 */
export function getDaysUntilDue(cycleStartDate: string, currentDate?: Date): number {
  const now = currentDate || new Date();
  const dueDate = parseISO(calculateDueDate(cycleStartDate));
  return differenceInDays(dueDate, now);
}

/**
 * Determina si un préstamo está vencido
 */
export function isLoanOverdue(cycleStartDate: string, currentDate?: Date): boolean {
  return getDaysUntilDue(cycleStartDate, currentDate) < 0;
}

/**
 * Extiende un préstamo con todos los cálculos actuales
 */
export function enrichLoanWithCalculations(
  loan: Loan,
  currentDate?: Date
): LoanWithCalculations {
  const days = getDaysElapsed(loan.cycle_start_date, currentDate);
  const rate = getInterestRate(days);
  const interest = calculateInterest(loan.principal, days);
  const totalOwed = loan.principal + interest;
  const dueDate = calculateDueDate(loan.cycle_start_date);
  const daysUntilDue = getDaysUntilDue(loan.cycle_start_date, currentDate);
  const isOverdue = daysUntilDue < 0;

  return {
    ...loan,
    days_elapsed: days,
    current_interest_rate: rate,
    current_interest: interest,
    total_owed: totalOwed,
    due_date: dueDate,
    is_overdue: isOverdue,
    days_until_due: daysUntilDue,
  };
}

/**
 * Calcula el interés proyectado (para estadísticas)
 */
export function calculateProjectedInterest(principal: number): number {
  return principal * RATE_NORMAL;
}

/**
 * Formatea la tasa de interés para mostrar
 */
export function formatInterestRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
