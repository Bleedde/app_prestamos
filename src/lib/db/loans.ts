import { v4 as uuidv4 } from 'uuid';
import { db } from './dexie';
import { createCycle } from './cycles';
import { pushLoanToSupabase, deleteLoanFromSupabase, getCurrentUserId } from './sync';
import { enrichLoanWithCalculations, calculateDueDate } from '@/lib/utils/interest';
import { getCurrentDateISO } from '@/lib/utils/format';
import type { Loan, LoanWithCalculations, CreateLoanInput, LoanStatus } from '@/types';

/**
 * Crea un nuevo préstamo con su primer ciclo
 */
export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const now = getCurrentDateISO();
  const startDate = input.start_date || now;
  const userId = await getCurrentUserId();

  const loan: Loan = {
    id: uuidv4(),
    user_id: userId,
    client_name: input.client_name.trim(),
    principal: input.principal,
    photo_url: input.photo_url,
    status: 'active',
    current_cycle: 1,
    cycle_start_date: startDate,
    created_at: now,
    updated_at: now,
  };

  // Guardar préstamo
  await db.loans.add(loan);

  // Crear primer ciclo
  await createCycle({
    loan_id: loan.id,
    cycle_number: 1,
    start_date: startDate,
  });

  // Sync con Supabase
  pushLoanToSupabase(loan);

  return loan;
}

/**
 * Obtiene todos los préstamos con cálculos actualizados
 */
export async function getAllLoans(): Promise<LoanWithCalculations[]> {
  const loans = await db.loans.toArray();
  return loans.map((loan) => enrichLoanWithCalculations(loan));
}

/**
 * Obtiene préstamos filtrados por estado
 */
export async function getLoansByStatus(
  status: LoanStatus
): Promise<LoanWithCalculations[]> {
  const loans = await db.loans.where('status').equals(status).toArray();
  return loans.map((loan) => enrichLoanWithCalculations(loan));
}

/**
 * Obtiene préstamos activos
 */
export async function getActiveLoans(): Promise<LoanWithCalculations[]> {
  return getLoansByStatus('active');
}

/**
 * Obtiene un préstamo por ID con cálculos
 */
export async function getLoanById(id: string): Promise<LoanWithCalculations | null> {
  const loan = await db.loans.get(id);
  if (!loan) return null;
  return enrichLoanWithCalculations(loan);
}

/**
 * Busca préstamos por nombre del cliente
 */
export async function searchLoansByClientName(
  searchTerm: string
): Promise<LoanWithCalculations[]> {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return getAllLoans();

  const loans = await db.loans
    .filter((loan) => loan.client_name.toLowerCase().includes(term))
    .toArray();

  return loans.map((loan) => enrichLoanWithCalculations(loan));
}

/**
 * Actualiza el estado de un préstamo
 */
export async function updateLoanStatus(
  id: string,
  status: LoanStatus
): Promise<void> {
  const updated_at = getCurrentDateISO();
  await db.loans.update(id, { status, updated_at });

  // Sync con Supabase
  const loan = await db.loans.get(id);
  if (loan) pushLoanToSupabase(loan);
}

/**
 * Inicia un nuevo ciclo para un préstamo (cuando paga solo intereses)
 */
export async function startNewCycle(loanId: string): Promise<void> {
  const loan = await db.loans.get(loanId);
  if (!loan) throw new Error('Préstamo no encontrado');

  const now = getCurrentDateISO();
  const newCycleNumber = loan.current_cycle + 1;

  // El nuevo ciclo inicia en la fecha de vencimiento del ciclo anterior,
  // NO en la fecha actual del pago. Esto preserva el día original del préstamo.
  // Ej: préstamo del 13 enero → ciclo 1: 13 ene-13 feb → ciclo 2: 13 feb-13 mar
  const newCycleStartDate = calculateDueDate(loan.cycle_start_date);
  const newCycleStartISO = newCycleStartDate.split('T')[0] + 'T00:00:00.000Z';

  // Actualizar préstamo con nuevo ciclo
  await db.loans.update(loanId, {
    current_cycle: newCycleNumber,
    cycle_start_date: newCycleStartISO,
    updated_at: now,
  });

  // Crear nuevo ciclo
  await createCycle({
    loan_id: loanId,
    cycle_number: newCycleNumber,
    start_date: newCycleStartISO,
  });

  // Sync con Supabase
  const updatedLoan = await db.loans.get(loanId);
  if (updatedLoan) pushLoanToSupabase(updatedLoan);
}

/**
 * Completa un préstamo (cuando paga el total)
 */
export async function completeLoan(id: string): Promise<void> {
  await updateLoanStatus(id, 'completed');
}

/**
 * Actualiza el capital de un préstamo (pago parcial)
 */
export async function updateLoanPrincipal(
  id: string,
  newPrincipal: number
): Promise<void> {
  if (newPrincipal <= 0) {
    // Si el capital llega a 0 o menos, completar el préstamo
    await completeLoan(id);
    return;
  }

  await db.loans.update(id, {
    principal: newPrincipal,
    updated_at: getCurrentDateISO(),
  });

  // Sync con Supabase
  const loan = await db.loans.get(id);
  if (loan) pushLoanToSupabase(loan);
}

/**
 * Edita el capital de un préstamo (sin afectar fechas ni ciclos)
 */
export async function editLoanPrincipal(
  id: string,
  newPrincipal: number
): Promise<void> {
  if (newPrincipal <= 0) {
    throw new Error('El capital debe ser mayor a 0');
  }

  await db.loans.update(id, {
    principal: newPrincipal,
    updated_at: getCurrentDateISO(),
  });

  const loan = await db.loans.get(id);
  if (loan) pushLoanToSupabase(loan);
}

/**
 * Actualiza la foto del cliente
 */
export async function updateLoanPhoto(
  id: string,
  photoUrl: string
): Promise<void> {
  await db.loans.update(id, {
    photo_url: photoUrl,
    updated_at: getCurrentDateISO(),
  });
}

/**
 * Elimina un préstamo y todos sus datos relacionados
 */
export async function deleteLoan(id: string): Promise<void> {
  await db.transaction('rw', [db.loans, db.cycles, db.payments], async () => {
    // Eliminar pagos
    await db.payments.where('loan_id').equals(id).delete();
    // Eliminar ciclos
    await db.cycles.where('loan_id').equals(id).delete();
    // Eliminar préstamo
    await db.loans.delete(id);
  });

  // Sync con Supabase
  await deleteLoanFromSupabase(id);
}

/**
 * Obtiene préstamos que vencen pronto (próximos 7 días)
 */
export async function getUpcomingDueLoans(): Promise<LoanWithCalculations[]> {
  const activeLoans = await getActiveLoans();
  return activeLoans.filter(
    (loan) => loan.days_until_due > 0 && loan.days_until_due <= 7
  );
}

/**
 * Obtiene préstamos vencidos
 */
export async function getOverdueLoans(): Promise<LoanWithCalculations[]> {
  const activeLoans = await getActiveLoans();
  return activeLoans.filter((loan) => loan.is_overdue);
}

/**
 * Cuenta préstamos por estado
 */
export async function countLoansByStatus(): Promise<Record<LoanStatus, number>> {
  const loans = await db.loans.toArray();
  return loans.reduce(
    (acc, loan) => {
      acc[loan.status]++;
      return acc;
    },
    { active: 0, completed: 0, overdue: 0 } as Record<LoanStatus, number>
  );
}
