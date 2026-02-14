import { db } from './dexie';
import { supabase } from './supabase';
import type { Loan, Cycle, Payment } from '@/types';

/**
 * Sincronización bidireccional entre Dexie (local) y Supabase (remoto)
 *
 * Estrategia:
 * - Al crear/modificar localmente -> push a Supabase
 * - Al cargar la app -> pull de Supabase y merge con local
 */

// ============== PUSH: Local -> Supabase ==============

export async function pushLoanToSupabase(loan: Loan): Promise<void> {
  try {
    const { error } = await supabase.from('loans').upsert({
      id: loan.id,
      client_name: loan.client_name,
      principal: loan.principal,
      photo_url: loan.photo_url || null,
      status: loan.status,
      current_cycle: loan.current_cycle,
      cycle_start_date: loan.cycle_start_date,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
    });
    if (error) console.error('Error pushing loan:', error);
  } catch (err) {
    console.error('Error pushing loan to Supabase:', err);
  }
}

export async function pushCycleToSupabase(cycle: Cycle): Promise<void> {
  try {
    const { error } = await supabase.from('cycles').upsert({
      id: cycle.id,
      loan_id: cycle.loan_id,
      cycle_number: cycle.cycle_number,
      start_date: cycle.start_date,
      end_date: cycle.end_date || null,
      status: cycle.status,
      created_at: cycle.created_at,
    });
    if (error) console.error('Error pushing cycle:', error);
  } catch (err) {
    console.error('Error pushing cycle to Supabase:', err);
  }
}

export async function pushPaymentToSupabase(payment: Payment): Promise<void> {
  try {
    const { error } = await supabase.from('payments').upsert({
      id: payment.id,
      loan_id: payment.loan_id,
      cycle_id: payment.cycle_id,
      amount: payment.amount,
      payment_type: payment.payment_type,
      payment_date: payment.payment_date,
      photo_url: payment.photo_url || null,
      notes: payment.notes || null,
      created_at: payment.created_at,
    });
    if (error) console.error('Error pushing payment:', error);
  } catch (err) {
    console.error('Error pushing payment to Supabase:', err);
  }
}

export async function deleteLoanFromSupabase(loanId: string): Promise<void> {
  try {
    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) console.error('Error deleting loan from Supabase:', error);
  } catch (err) {
    console.error('Error deleting loan from Supabase:', err);
  }
}

// ============== PULL: Supabase -> Local ==============

export async function pullLoansFromSupabase(): Promise<Loan[]> {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error pulling loans:', error);
      return [];
    }

    return (data || []).map((loan) => ({
      id: loan.id,
      client_name: loan.client_name,
      principal: Number(loan.principal),
      photo_url: loan.photo_url || undefined,
      status: loan.status as Loan['status'],
      current_cycle: loan.current_cycle,
      cycle_start_date: loan.cycle_start_date,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
    }));
  } catch (err) {
    console.error('Error pulling loans from Supabase:', err);
    return [];
  }
}

export async function pullCyclesFromSupabase(): Promise<Cycle[]> {
  try {
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error pulling cycles:', error);
      return [];
    }

    return (data || []).map((cycle) => ({
      id: cycle.id,
      loan_id: cycle.loan_id,
      cycle_number: cycle.cycle_number,
      start_date: cycle.start_date,
      end_date: cycle.end_date || undefined,
      status: cycle.status as Cycle['status'],
      created_at: cycle.created_at,
    }));
  } catch (err) {
    console.error('Error pulling cycles from Supabase:', err);
    return [];
  }
}

export async function pullPaymentsFromSupabase(): Promise<Payment[]> {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error pulling payments:', error);
      return [];
    }

    return (data || []).map((payment) => ({
      id: payment.id,
      loan_id: payment.loan_id,
      cycle_id: payment.cycle_id,
      amount: Number(payment.amount),
      payment_type: payment.payment_type as Payment['payment_type'],
      payment_date: payment.payment_date,
      photo_url: payment.photo_url || undefined,
      notes: payment.notes || undefined,
      created_at: payment.created_at,
    }));
  } catch (err) {
    console.error('Error pulling payments from Supabase:', err);
    return [];
  }
}

// ============== SYNC COMPLETO ==============

export async function syncAll(): Promise<{ success: boolean; message: string }> {
  try {
    // Pull de Supabase
    const [remoteLoans, remoteCycles, remotePayments] = await Promise.all([
      pullLoansFromSupabase(),
      pullCyclesFromSupabase(),
      pullPaymentsFromSupabase(),
    ]);

    // Merge con local (Supabase tiene prioridad en caso de conflicto)
    await db.transaction('rw', [db.loans, db.cycles, db.payments], async () => {
      // Insertar/actualizar loans
      for (const loan of remoteLoans) {
        await db.loans.put(loan);
      }

      // Insertar/actualizar cycles
      for (const cycle of remoteCycles) {
        await db.cycles.put(cycle);
      }

      // Insertar/actualizar payments
      for (const payment of remotePayments) {
        await db.payments.put(payment);
      }
    });

    // Push de datos locales que no existan en remoto
    const localLoans = await db.loans.toArray();
    const remoteIds = new Set(remoteLoans.map((l) => l.id));

    for (const loan of localLoans) {
      if (!remoteIds.has(loan.id)) {
        await pushLoanToSupabase(loan);

        // También push cycles y payments de este loan
        const cycles = await db.cycles.where('loan_id').equals(loan.id).toArray();
        for (const cycle of cycles) {
          await pushCycleToSupabase(cycle);
        }

        const payments = await db.payments.where('loan_id').equals(loan.id).toArray();
        for (const payment of payments) {
          await pushPaymentToSupabase(payment);
        }
      }
    }

    return { success: true, message: 'Sincronización completada' };
  } catch (err) {
    console.error('Error en sincronización:', err);
    return { success: false, message: 'Error al sincronizar' };
  }
}

// ============== SUSCRIPCIÓN EN TIEMPO REAL ==============

export function subscribeToChanges(onUpdate: () => void) {
  const channel = supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loans' },
      async () => {
        await syncAll();
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cycles' },
      async () => {
        await syncAll();
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments' },
      async () => {
        await syncAll();
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
