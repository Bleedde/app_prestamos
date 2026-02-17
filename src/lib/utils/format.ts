import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea un número como moneda colombiana (COP)
 * Ejemplo: 100000 -> "$100.000"
 * @param amount Monto a formatear
 * @param showDecimals Mostrar decimales (default: false para montos enteros)
 * @returns String formateado
 */
export function formatCOP(amount: number, showDecimals = false): string {
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  // Reemplazar "COP" por "$" para formato más corto
  return formatter.format(amount).replace('COP', '$').replace(/\s/g, '');
}

/**
 * Parsea una fecha como medianoche LOCAL (evita desfases por zona horaria)
 */
function parseLocalDate(dateString: string): Date {
  const dateStr = dateString.split('T')[0];
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formatea una fecha en formato legible en español
 * Ejemplo: "2025-02-13" -> "13 de febrero, 2025"
 * @param dateString Fecha en formato ISO
 * @returns String formateado
 */
export function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return format(date, "d 'de' MMMM, yyyy", { locale: es });
}

/**
 * Formatea una fecha en formato corto
 * Ejemplo: "2025-02-13" -> "13 feb"
 * @param dateString Fecha en formato ISO
 * @returns String formateado corto
 */
export function formatDateShort(dateString: string): string {
  const date = parseLocalDate(dateString);
  return format(date, 'd MMM', { locale: es });
}

/**
 * Formatea una fecha en formato muy corto
 * Ejemplo: "2025-02-13" -> "13/02"
 * @param dateString Fecha en formato ISO
 * @returns String formateado
 */
export function formatDateCompact(dateString: string): string {
  const date = parseLocalDate(dateString);
  return format(date, 'dd/MM', { locale: es });
}

/**
 * Formatea una fecha con hora
 * Ejemplo: "2025-02-13T10:30:00" -> "13 de febrero, 2025 a las 10:30"
 * @param dateString Fecha en formato ISO
 * @returns String formateado con hora
 */
export function formatDateTime(dateString: string): string {
  const date = parseLocalDate(dateString);
  return format(date, "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es });
}

/**
 * Obtiene la fecha actual en formato ISO
 * @returns Fecha ISO string
 */
export function getCurrentDateISO(): string {
  return new Date().toISOString();
}

/**
 * Obtiene solo la fecha (sin hora) en formato ISO
 * @returns Fecha ISO string (medianoche UTC)
 */
export function getTodayISO(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

/**
 * Parsea un string de monto y lo convierte a número
 * Maneja formatos como "100.000" o "100,000"
 * @param value String con el monto
 * @returns Número parseado
 */
export function parseAmount(value: string): number {
  // Remover todo excepto números y puntos/comas decimales
  const cleaned = value.replace(/[^\d.,]/g, '');
  // Reemplazar coma por punto para decimales
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formatea días transcurridos de forma legible
 * @param days Número de días
 * @returns String formateado
 */
export function formatDays(days: number): string {
  if (days === 1) return '1 día';
  return `${days} días`;
}

/**
 * Formatea los días hasta vencimiento
 * @param daysUntilDue Días hasta vencimiento (puede ser negativo)
 * @returns String formateado con contexto
 */
export function formatDaysUntilDue(daysUntilDue: number): string {
  if (daysUntilDue === 0) return 'Vence hoy';
  if (daysUntilDue === 1) return 'Vence mañana';
  if (daysUntilDue > 0) return `Vence en ${daysUntilDue} días`;
  if (daysUntilDue === -1) return 'Venció ayer';
  return `Vencido hace ${Math.abs(daysUntilDue)} días`;
}
