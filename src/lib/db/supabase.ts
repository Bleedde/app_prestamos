import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';

export const supabase = createBrowserSupabaseClient();

// Tipos para las tablas de Supabase
export interface SupabaseLoan {
  id: string;
  user_id: string;
  client_name: string;
  principal: number;
  photo_url: string | null;
  status: string;
  current_cycle: number;
  cycle_start_date: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCycle {
  id: string;
  user_id: string;
  loan_id: string;
  cycle_number: number;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
}

export interface SupabasePayment {
  id: string;
  user_id: string;
  loan_id: string;
  cycle_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}
