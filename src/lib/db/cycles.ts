import { v4 as uuidv4 } from 'uuid';
import { db } from './dexie';
import { pushCycleToSupabase } from './sync';
import { getCurrentDateISO } from '@/lib/utils/format';
import type { Cycle, CycleStatus } from '@/types';

interface CreateCycleInput {
  loan_id: string;
  cycle_number: number;
  start_date: string;
}

/**
 * Crea un nuevo ciclo
 */
export async function createCycle(input: CreateCycleInput): Promise<Cycle> {
  const now = getCurrentDateISO();

  const cycle: Cycle = {
    id: uuidv4(),
    loan_id: input.loan_id,
    cycle_number: input.cycle_number,
    start_date: input.start_date,
    end_date: undefined,
    status: 'active',
    created_at: now,
  };

  await db.cycles.add(cycle);

  // Sync con Supabase
  pushCycleToSupabase(cycle);

  return cycle;
}

/**
 * Obtiene todos los ciclos de un préstamo
 */
export async function getCyclesByLoanId(loanId: string): Promise<Cycle[]> {
  return db.cycles
    .where('loan_id')
    .equals(loanId)
    .sortBy('cycle_number');
}

/**
 * Obtiene el ciclo activo de un préstamo
 */
export async function getActiveCycle(loanId: string): Promise<Cycle | null> {
  const cycles = await db.cycles
    .where('loan_id')
    .equals(loanId)
    .and((cycle) => cycle.status === 'active')
    .toArray();

  return cycles[0] || null;
}

/**
 * Obtiene un ciclo por ID
 */
export async function getCycleById(id: string): Promise<Cycle | null> {
  const cycle = await db.cycles.get(id);
  return cycle || null;
}

/**
 * Cierra un ciclo (cuando se completa o se renueva)
 */
export async function closeCycle(
  cycleId: string,
  endDate?: string
): Promise<void> {
  await db.cycles.update(cycleId, {
    status: 'completed' as CycleStatus,
    end_date: endDate || getCurrentDateISO(),
  });

  // Sync con Supabase
  const cycle = await db.cycles.get(cycleId);
  if (cycle) pushCycleToSupabase(cycle);
}

/**
 * Cierra el ciclo activo de un préstamo
 */
export async function closeActiveCycle(loanId: string): Promise<void> {
  const activeCycle = await getActiveCycle(loanId);
  if (activeCycle) {
    await closeCycle(activeCycle.id);
  }
}

/**
 * Cuenta ciclos completados de un préstamo
 */
export async function countCompletedCycles(loanId: string): Promise<number> {
  return db.cycles
    .where('loan_id')
    .equals(loanId)
    .and((cycle) => cycle.status === 'completed')
    .count();
}

/**
 * Obtiene el historial de ciclos con resumen
 */
export async function getCycleHistory(loanId: string): Promise<{
  total_cycles: number;
  completed_cycles: number;
  current_cycle: Cycle | null;
  cycles: Cycle[];
}> {
  const cycles = await getCyclesByLoanId(loanId);
  const activeCycle = cycles.find((c) => c.status === 'active') || null;
  const completedCount = cycles.filter((c) => c.status === 'completed').length;

  return {
    total_cycles: cycles.length,
    completed_cycles: completedCount,
    current_cycle: activeCycle,
    cycles,
  };
}
