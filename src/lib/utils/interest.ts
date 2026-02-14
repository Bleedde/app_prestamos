import { differenceInDays, addDays, parseISO } from 'date-fns';
import type { Loan, LoanWithCalculations } from '@/types';

/**
 * LÓGICA DE INTERESES
 *
 * - Semanas 1-4 (días 1-28): 10% sobre el capital
 * - Día 29 en adelante: 15% sobre el capital
 *
 * El interés siempre se calcula sobre el capital original,
 * nunca sobre intereses acumulados (no hay interés compuesto).
 */

const RATE_NORMAL = 0.10; // 10% semanas 1-4
const RATE_OVERDUE = 0.15; // 15% día 29+
const CYCLE_DAYS = 30; // Duración de un ciclo

/**
 * Obtiene la tasa de interés basada en los días transcurridos
 * @param days Días desde el inicio del ciclo
 * @returns Tasa de interés (0.10 o 0.15)
 */
export function getInterestRate(days: number): number {
  // Días 1-28: 10%
  // Días 29+: 15%
  if (days <= 28) {
    return RATE_NORMAL;
  }
  return RATE_OVERDUE;
}

/**
 * Calcula los días transcurridos desde una fecha
 * @param startDate Fecha de inicio (ISO string)
 * @param currentDate Fecha actual (opcional, default: hoy)
 * @returns Número de días transcurridos (mínimo 1)
 */
export function getDaysElapsed(startDate: string, currentDate?: Date): number {
  const start = parseISO(startDate);
  const now = currentDate || new Date();
  const days = differenceInDays(now, start);
  // Mínimo 1 día (el día del préstamo cuenta)
  return Math.max(1, days + 1);
}

/**
 * Calcula el interés actual basado en el capital y días transcurridos
 * @param principal Monto del capital
 * @param days Días transcurridos desde el inicio del ciclo
 * @returns Monto del interés
 */
export function calculateInterest(principal: number, days: number): number {
  const rate = getInterestRate(days);
  return principal * rate;
}

/**
 * Calcula el total adeudado (capital + intereses)
 * @param principal Monto del capital
 * @param days Días transcurridos desde el inicio del ciclo
 * @returns Total adeudado
 */
export function calculateTotalOwed(principal: number, days: number): number {
  return principal + calculateInterest(principal, days);
}

/**
 * Calcula la fecha de vencimiento (30 días desde inicio del ciclo)
 * @param cycleStartDate Fecha de inicio del ciclo (ISO string)
 * @returns Fecha de vencimiento (ISO string)
 */
export function calculateDueDate(cycleStartDate: string): string {
  const start = parseISO(cycleStartDate);
  const dueDate = addDays(start, CYCLE_DAYS - 1); // -1 porque el día 1 cuenta
  return dueDate.toISOString();
}

/**
 * Calcula los días hasta el vencimiento
 * @param cycleStartDate Fecha de inicio del ciclo (ISO string)
 * @param currentDate Fecha actual (opcional)
 * @returns Días hasta vencimiento (negativo si ya venció)
 */
export function getDaysUntilDue(cycleStartDate: string, currentDate?: Date): number {
  const daysElapsed = getDaysElapsed(cycleStartDate, currentDate);
  return CYCLE_DAYS - daysElapsed;
}

/**
 * Determina si un préstamo está vencido
 * @param cycleStartDate Fecha de inicio del ciclo
 * @param currentDate Fecha actual (opcional)
 * @returns true si han pasado más de 30 días
 */
export function isLoanOverdue(cycleStartDate: string, currentDate?: Date): boolean {
  const daysElapsed = getDaysElapsed(cycleStartDate, currentDate);
  return daysElapsed > CYCLE_DAYS;
}

/**
 * Extiende un préstamo con todos los cálculos actuales
 * @param loan Préstamo base
 * @param currentDate Fecha actual (opcional)
 * @returns Préstamo con cálculos
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
 * Calcula el interés proyectado al día 30 (para estadísticas)
 * Al día 30, la tasa sigue siendo 10%
 * @param principal Monto del capital
 * @returns Interés proyectado
 */
export function calculateProjectedInterest(principal: number): number {
  return principal * RATE_NORMAL;
}

/**
 * Formatea la tasa de interés para mostrar
 * @param rate Tasa decimal (0.10 o 0.15)
 * @returns String formateado ("10%" o "15%")
 */
export function formatInterestRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}
