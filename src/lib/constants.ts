// Configuración de negocio centralizada
// Cambiar estos valores actualiza toda la app automáticamente

/** Tasa de interés normal (primeras 2 semanas) */
export const RATE_NORMAL = 0.10;

/** Tasa de interés por mora (después de 2 semanas) */
export const RATE_OVERDUE = 0.15;

/** Días umbral para cambio de tasa (2 semanas) */
export const DAYS_RATE_THRESHOLD = 14;

/** Duración del ciclo en días */
export const CYCLE_DAYS = 30;

/** Días antes del vencimiento para notificación "próximo a vencer" */
export const DAYS_DUE_SOON_THRESHOLD = 7;

/** Días antes del vencimiento para badge "por vencer" en tarjetas */
export const DAYS_DUE_WARNING_THRESHOLD = 3;

/** Cantidad de préstamos a mostrar por página */
export const LOANS_PAGE_SIZE = 20;
