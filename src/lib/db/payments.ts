import { v4 as uuidv4 } from 'uuid';
import { db } from './dexie';
import { getActiveCycle, closeActiveCycle } from './cycles';
import { completeLoan, startNewCycle, updateLoanPrincipal, getLoanById } from './loans';
import { pushPaymentToSupabase, getCurrentUserId } from './sync';
import { getCurrentDateISO } from '@/lib/utils/format';
import type { Payment, CreatePaymentInput, PaymentType } from '@/types';

/**
 * Registra un pago y ejecuta la lógica correspondiente según el tipo
 *
 * TIPOS DE PAGO:
 * - complete: Paga capital + intereses, cierra el préstamo
 * - interest_only: Paga solo intereses, inicia nuevo ciclo
 * - partial: Paga parte del capital, reduce el monto adeudado
 */
export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  const now = getCurrentDateISO();

  // Obtener el préstamo y ciclo activo
  const loan = await getLoanById(input.loan_id);
  if (!loan) throw new Error('Préstamo no encontrado');
  if (loan.status !== 'active') throw new Error('El préstamo no está activo');

  const activeCycle = await getActiveCycle(input.loan_id);
  if (!activeCycle) throw new Error('No hay ciclo activo');

  // Crear el registro de pago
  const userId = await getCurrentUserId();
  const payment: Payment = {
    id: uuidv4(),
    user_id: userId,
    loan_id: input.loan_id,
    cycle_id: activeCycle.id,
    amount: input.amount,
    payment_type: input.payment_type,
    payment_date: now,
    photo_url: input.photo_url,
    notes: input.notes,
    created_at: now,
  };

  // Ejecutar dentro de una transacción para mantener consistencia
  await db.transaction('rw', [db.payments, db.loans, db.cycles], async () => {
    // Guardar el pago
    await db.payments.add(payment);

    // Ejecutar lógica según tipo de pago
    switch (input.payment_type) {
      case 'complete':
        // Cerrar ciclo y completar préstamo
        await closeActiveCycle(input.loan_id);
        await completeLoan(input.loan_id);
        break;

      case 'interest_only':
        // Cerrar ciclo actual e iniciar nuevo
        await closeActiveCycle(input.loan_id);
        await startNewCycle(input.loan_id);
        break;

      case 'partial':
        // Reducir el capital
        const newPrincipal = loan.principal - input.amount;
        await updateLoanPrincipal(input.loan_id, newPrincipal);
        break;
    }
  });

  // Sync con Supabase
  pushPaymentToSupabase(payment);

  return payment;
}

/**
 * Obtiene todos los pagos de un préstamo
 */
export async function getPaymentsByLoanId(loanId: string): Promise<Payment[]> {
  return db.payments
    .where('loan_id')
    .equals(loanId)
    .reverse()
    .sortBy('payment_date');
}

/**
 * Obtiene todos los pagos de un ciclo específico
 */
export async function getPaymentsByCycleId(cycleId: string): Promise<Payment[]> {
  return db.payments
    .where('cycle_id')
    .equals(cycleId)
    .sortBy('payment_date');
}

/**
 * Obtiene un pago por ID
 */
export async function getPaymentById(id: string): Promise<Payment | null> {
  const payment = await db.payments.get(id);
  return payment || null;
}

/**
 * Calcula el total pagado en un préstamo
 */
export async function getTotalPaidByLoanId(loanId: string): Promise<number> {
  const payments = await getPaymentsByLoanId(loanId);
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

/**
 * Calcula el total de intereses pagados (pagos de tipo interest_only)
 */
export async function getTotalInterestPaid(loanId: string): Promise<number> {
  const payments = await db.payments
    .where('loan_id')
    .equals(loanId)
    .and((p) => p.payment_type === 'interest_only')
    .toArray();

  return payments.reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Obtiene estadísticas de pagos
 */
export async function getPaymentStats(loanId: string): Promise<{
  total_payments: number;
  total_amount: number;
  interest_payments: number;
  interest_amount: number;
  partial_payments: number;
  partial_amount: number;
}> {
  const payments = await getPaymentsByLoanId(loanId);

  const stats = {
    total_payments: payments.length,
    total_amount: 0,
    interest_payments: 0,
    interest_amount: 0,
    partial_payments: 0,
    partial_amount: 0,
  };

  for (const payment of payments) {
    stats.total_amount += payment.amount;

    if (payment.payment_type === 'interest_only') {
      stats.interest_payments++;
      stats.interest_amount += payment.amount;
    } else if (payment.payment_type === 'partial') {
      stats.partial_payments++;
      stats.partial_amount += payment.amount;
    }
  }

  return stats;
}

/**
 * Obtiene los pagos recientes (últimos 30 días)
 */
export async function getRecentPayments(limit = 10): Promise<Payment[]> {
  return db.payments
    .orderBy('payment_date')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Valida si un monto de pago es válido según el tipo
 */
export function validatePaymentAmount(
  paymentType: PaymentType,
  amount: number,
  principal: number,
  interest: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'El monto debe ser mayor a 0' };
  }

  switch (paymentType) {
    case 'complete':
      const totalOwed = principal + interest;
      if (amount < totalOwed) {
        return {
          valid: false,
          error: `El pago completo debe ser al menos ${totalOwed}`,
        };
      }
      break;

    case 'interest_only':
      if (Math.abs(amount - interest) > 0.01) {
        return {
          valid: false,
          error: `El pago de intereses debe ser exactamente ${interest}`,
        };
      }
      break;

    case 'partial':
      if (amount > principal) {
        return {
          valid: false,
          error: `El pago parcial no puede exceder el capital de ${principal}`,
        };
      }
      break;
  }

  return { valid: true };
}
