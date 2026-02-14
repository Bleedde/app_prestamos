import Dexie, { type EntityTable } from 'dexie';
import type { Loan, Cycle, Payment } from '@/types';

// Definición de la base de datos local con Dexie (IndexedDB)
class LoanDatabase extends Dexie {
  loans!: EntityTable<Loan, 'id'>;
  cycles!: EntityTable<Cycle, 'id'>;
  payments!: EntityTable<Payment, 'id'>;

  constructor() {
    super('LoanDatabase');

    this.version(1).stores({
      loans: 'id, client_name, status, current_cycle, cycle_start_date, created_at',
      cycles: 'id, loan_id, cycle_number, status, start_date',
      payments: 'id, loan_id, cycle_id, payment_type, payment_date',
    });

    this.version(2).stores({
      loans: 'id, user_id, client_name, status, current_cycle, cycle_start_date, created_at',
      cycles: 'id, user_id, loan_id, cycle_number, status, start_date',
      payments: 'id, user_id, loan_id, cycle_id, payment_type, payment_date',
    });
  }
}

// Instancia singleton de la base de datos
export const db = new LoanDatabase();

// Funciones de utilidad para la base de datos
export async function clearDatabase(): Promise<void> {
  await db.loans.clear();
  await db.cycles.clear();
  await db.payments.clear();
}

export async function getDatabaseStats(): Promise<{
  loans: number;
  cycles: number;
  payments: number;
}> {
  const [loans, cycles, payments] = await Promise.all([
    db.loans.count(),
    db.cycles.count(),
    db.payments.count(),
  ]);
  return { loans, cycles, payments };
}
