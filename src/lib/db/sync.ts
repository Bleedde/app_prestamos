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

// ============== AUTH HELPER ==============

export async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');
  return user.id;
}

// ============== PUSH: Local -> Supabase ==============

export async function pushLoanToSupabase(loan: Loan): Promise<void> {
  try {
    const { error } = await supabase.from('loans').upsert({
      id: loan.id,
      user_id: loan.user_id,
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
      user_id: cycle.user_id,
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
      user_id: payment.user_id,
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
    // Eliminar payments y cycles primero (en caso de que no haya CASCADE en la BD)
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('loan_id', loanId);
    if (paymentsError) console.error('Error deleting payments from Supabase:', paymentsError);

    const { error: cyclesError } = await supabase
      .from('cycles')
      .delete()
      .eq('loan_id', loanId);
    if (cyclesError) console.error('Error deleting cycles from Supabase:', cyclesError);

    // Finalmente eliminar el préstamo
    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) console.error('Error deleting loan from Supabase:', error);
  } catch (err) {
    console.error('Error deleting loan from Supabase:', err);
  }
}

// ============== PULL: Supabase -> Local ==============

export async function pullLoansFromSupabase(userId?: string): Promise<Loan[]> {
  try {
    if (!userId) userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error pulling loans:', error);
      return [];
    }

    return (data || []).map((loan) => ({
      id: loan.id,
      user_id: loan.user_id,
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

export async function pullCyclesFromSupabase(userId?: string): Promise<Cycle[]> {
  try {
    if (!userId) userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error pulling cycles:', error);
      return [];
    }

    return (data || []).map((cycle) => ({
      id: cycle.id,
      user_id: cycle.user_id,
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

export async function pullPaymentsFromSupabase(userId?: string): Promise<Payment[]> {
  try {
    if (!userId) userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Error pulling payments:', error);
      return [];
    }

    return (data || []).map((payment) => ({
      id: payment.id,
      user_id: payment.user_id,
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
    const userId = await getCurrentUserId();

    // Pull de Supabase (reutilizando el userId ya obtenido)
    const [remoteLoans, remoteCycles, remotePayments] = await Promise.all([
      pullLoansFromSupabase(userId),
      pullCyclesFromSupabase(userId),
      pullPaymentsFromSupabase(userId),
    ]);

    const remoteLoanIds = new Set(remoteLoans.map((l) => l.id));
    const remoteCycleIds = new Set(remoteCycles.map((c) => c.id));
    const remotePaymentIds = new Set(remotePayments.map((p) => p.id));

    // Leer datos locales del usuario actual para encontrar registros no sincronizados
    const [localLoans, localCycles, localPayments] = await Promise.all([
      db.loans.where('user_id').equals(userId).toArray(),
      db.cycles.where('user_id').equals(userId).toArray(),
      db.payments.where('user_id').equals(userId).toArray(),
    ]);

    // Push registros locales que no existen en Supabase
    // (pueden ser registros recién creados cuyo push aún no llegó)
    // Orden: loans → cycles → payments (respetar FK constraints)
    const localOnlyLoans = localLoans.filter((l) => !remoteLoanIds.has(l.id));
    const localOnlyCycles = localCycles.filter((c) => !remoteCycleIds.has(c.id));
    const localOnlyPayments = localPayments.filter((p) => !remotePaymentIds.has(p.id));

    for (const loan of localOnlyLoans) {
      await pushLoanToSupabase(loan);
    }
    for (const cycle of localOnlyCycles) {
      await pushCycleToSupabase(cycle);
    }
    for (const payment of localOnlyPayments) {
      await pushPaymentToSupabase(payment);
    }

    // Push loans modificados localmente que son más recientes que la versión remota
    const remoteLoanMap = new Map(remoteLoans.map((l) => [l.id, l]));
    for (const localLoan of localLoans) {
      const remoteLoan = remoteLoanMap.get(localLoan.id);
      if (remoteLoan && localLoan.updated_at > remoteLoan.updated_at) {
        await pushLoanToSupabase(localLoan);
      }
    }

    // Insertar/actualizar con datos remotos (solo si no hay versión local más reciente)
    await db.transaction('rw', [db.loans, db.cycles, db.payments], async () => {
      for (const loan of remoteLoans) {
        const localLoan = localLoans.find((l) => l.id === loan.id);
        if (!localLoan || loan.updated_at >= localLoan.updated_at) {
          await db.loans.put(loan);
        }
      }

      for (const cycle of remoteCycles) {
        await db.cycles.put(cycle);
      }

      for (const payment of remotePayments) {
        await db.payments.put(payment);
      }
    });

    return { success: true, message: 'Sincronización completada' };
  } catch (err) {
    console.error('Error en sincronización:', err);
    return { success: false, message: 'Error al sincronizar' };
  }
}

// ============== SUSCRIPCIÓN EN TIEMPO REAL ==============

export function subscribeToChanges(onUpdate: () => void, userId: string) {
  const channel = supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'loans', filter: `user_id=eq.${userId}` },
      async () => {
        await syncAll();
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cycles', filter: `user_id=eq.${userId}` },
      async () => {
        await syncAll();
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${userId}` },
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
