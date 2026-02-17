import { differenceInDays } from 'date-fns';
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

/**
 * Parsea una fecha como medianoche LOCAL (evita desfases por zona horaria)
 * Acepta "2026-01-13", "2026-01-13T05:00:00.000Z", etc.
 */
function parseLocalDate(dateString: string): Date {
  const dateStr = dateString.split('T')[0]; // extraer solo YYYY-MM-DD
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day); // medianoche LOCAL
}

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
  const start = parseLocalDate(startDate);
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
 * Usa aritmética pura de strings para evitar problemas de zona horaria
 */
export function calculateDueDate(cycleStartDate: string): string {
  const dateStr = cycleStartDate.split('T')[0]; // "2026-01-13"
  const [year, month, day] = dateStr.split('-').map(Number);

  let newMonth = month + 1;
  let newYear = year;
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  }

  // Manejar meses con menos días (ej: 31 ene -> 28 feb)
  const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(day, daysInNewMonth);

  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}

/**
 * Calcula los días hasta el vencimiento
 */
export function getDaysUntilDue(cycleStartDate: string, currentDate?: Date): number {
  const now = currentDate || new Date();
  const dueDate = parseLocalDate(calculateDueDate(cycleStartDate));
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
