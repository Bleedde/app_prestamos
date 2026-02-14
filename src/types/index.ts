// Tipos principales para la aplicación de préstamos

export type LoanStatus = 'active' | 'completed' | 'overdue';
export type CycleStatus = 'active' | 'completed';
export type PaymentType = 'complete' | 'interest_only' | 'partial';

export interface Loan {
  id: string;
  client_name: string;
  principal: number; // Monto principal del préstamo
  photo_url?: string; // Foto del cliente (opcional)
  status: LoanStatus;
  current_cycle: number; // Número de ciclo actual (empieza en 1)
  cycle_start_date: string; // Fecha de inicio del ciclo actual (ISO 8601)
  created_at: string; // Fecha de creación del préstamo (ISO 8601)
  updated_at: string;
}

export interface Cycle {
  id: string;
  loan_id: string;
  cycle_number: number;
  start_date: string; // ISO 8601
  end_date?: string; // ISO 8601, null si está activo
  status: CycleStatus;
  created_at: string;
}

export interface Payment {
  id: string;
  loan_id: string;
  cycle_id: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string; // ISO 8601
  photo_url?: string; // Foto del comprobante (opcional)
  notes?: string;
  created_at: string;
}

// Tipos extendidos con datos calculados
export interface LoanWithCalculations extends Loan {
  days_elapsed: number; // Días desde inicio del ciclo
  current_interest_rate: number; // Tasa actual (0.10 o 0.15)
  current_interest: number; // Interés calculado
  total_owed: number; // Capital + intereses
  due_date: string; // Fecha de vencimiento (30 días desde inicio ciclo)
  is_overdue: boolean;
  days_until_due: number; // Días hasta vencimiento (negativo si pasado)
}

// Para formularios
export interface CreateLoanInput {
  client_name: string;
  principal: number;
  photo_url?: string;
  start_date?: string; // Si no se especifica, usa fecha actual
}

export interface CreatePaymentInput {
  loan_id: string;
  amount: number;
  payment_type: PaymentType;
  photo_url?: string;
  notes?: string;
}

// Estadísticas
export interface FinancialSummary {
  total_capital_lent: number; // Suma de todos los préstamos activos
  total_interest_projected: number; // Intereses proyectados al día 30
  total_interest_earned: number; // Intereses ya cobrados
  active_loans_count: number;
  overdue_loans_count: number;
  completed_loans_count: number;
}

// Para notificaciones
export interface LoanNotification {
  loan: LoanWithCalculations;
  type: 'upcoming' | 'due_soon' | 'overdue';
  message: string;
}
