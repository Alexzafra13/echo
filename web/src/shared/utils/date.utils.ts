import i18n from '@shared/i18n';

/**
 * Date utilities for formatting dates and relative times
 *
 * This is the canonical source for all date formatting functions.
 * Prefer importing from here instead of other utils files.
 */

export type Locale = 'es' | 'en';

const translations = {
  es: {
    now: 'ahora',
    minutesAgo: (n: number) => `hace ${n} min`,
    hoursAgo: (n: number) => `hace ${n}h`,
    daysAgo: (n: number) => `hace ${n}d`,
    weeksAgo: (n: number) => `hace ${n} sem`,
    monthsAgo: (n: number) => `hace ${n} ${n === 1 ? 'mes' : 'meses'}`,
  },
  en: {
    now: 'now',
    minutesAgo: (n: number) => `${n}m ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
    weeksAgo: (n: number) => `${n}w ago`,
    monthsAgo: (n: number) => `${n}mo ago`,
  },
} as const;

/**
 * Formats a date relative to now (e.g., "hace 5m", "hace 2h")
 *
 * @param dateInput - ISO date string or Date object
 * @param locale - Language code (default: 'es')
 * @returns Formatted relative time string
 *
 * @example
 * formatTimeAgo('2024-01-01T12:00:00Z') // "hace 5m"
 * formatTimeAgo(new Date(), 'en') // "now"
 */
export function formatTimeAgo(dateInput: string | Date, locale: Locale = 'es'): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Handle future dates
  if (diffMs < 0) {
    return translations[locale].now;
  }

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const t = translations[locale];

  if (diffMins < 1) return t.now;
  if (diffMins < 60) return t.minutesAgo(diffMins);
  if (diffHours < 24) return t.hoursAgo(diffHours);
  if (diffDays < 7) return t.daysAgo(diffDays);
  if (diffWeeks < 4) return t.weeksAgo(diffWeeks);
  return t.monthsAgo(diffMonths);
}

/**
 * Formats a date to a localized string
 *
 * @param dateInput - ISO date string, Date object, or undefined
 * @param options - Intl.DateTimeFormatOptions (default: medium date style)
 * @param locale - Locale string (default: 'es-ES')
 * @returns Formatted date string, or 'Desconocida' if undefined
 *
 * @example
 * formatDate('2024-01-15') // "15 ene 2024"
 * formatDate(new Date(), { dateStyle: 'long' }) // "15 de enero de 2024"
 * formatDate(undefined) // "Desconocida"
 */
export function formatDate(
  dateInput: string | Date | undefined | null,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale = i18n.language
): string {
  if (!dateInput) return i18n.t('common.unknown');
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat(locale || i18n.language, options).format(date);
}

/**
 * Formats a date to show date and time (e.g., "15 ene 2024, 14:30")
 *
 * @param dateInput - ISO date string, Date object, or undefined
 * @param locale - Locale string (default: 'es-ES')
 * @returns Formatted datetime string
 */
export function formatDateTime(
  dateInput: string | Date | undefined | null,
  locale = i18n.language
): string {
  if (!dateInput) return 'N/A';
  return formatDate(dateInput, { dateStyle: 'medium', timeStyle: 'short' }, locale);
}

/**
 * Format date to short format (DD/MM/YYYY HH:mm)
 *
 * @param dateInput - Date string, Date object, or undefined
 * @returns Formatted date string
 */
export function formatDateShort(dateInput?: string | Date): string {
  if (!dateInput) return 'N/A';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleString(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date with time including seconds (DD/MM/YYYY HH:mm:ss)
 *
 * @param dateInput - Date string, Date object, or undefined
 * @returns Formatted date string
 */
export function formatDateWithTime(dateInput?: string | Date): string {
  if (!dateInput) return 'N/A';
  return new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateInput));
}

/**
 * Format date with abbreviated month and time (e.g., "15 ene 2024, 14:30")
 *
 * @param dateInput - Date string, Date object, or undefined
 * @returns Formatted date string
 */
export function formatDateCompact(dateInput?: string | Date): string {
  if (!dateInput) return i18n.t('common.never');
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString(i18n.language, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time from now (e.g., "hace 2 días", "hace 5 minutos")
 *
 * @param date - Date object or timestamp
 * @returns Formatted relative time string in Spanish
 */
export function formatDistanceToNow(date: Date | number): string {
  const now = new Date();
  const targetDate = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const t = i18n.t.bind(i18n);
  if (diffSeconds < 60) {
    return t('common.secondsAgo');
  } else if (diffMinutes < 60) {
    return diffMinutes === 1
      ? t('common.minuteAgo')
      : t('common.minutesAgo', { count: diffMinutes });
  } else if (diffHours < 24) {
    return diffHours === 1 ? t('common.hourAgo') : t('common.hoursAgo', { count: diffHours });
  } else if (diffDays < 7) {
    return diffDays === 1 ? t('common.dayAgo') : t('common.daysAgo', { count: diffDays });
  } else if (diffWeeks < 4) {
    return diffWeeks === 1 ? t('common.weekAgo') : t('common.weeksAgo', { count: diffWeeks });
  } else if (diffMonths < 12) {
    return diffMonths === 1 ? t('common.monthAgo') : t('common.monthsAgo', { count: diffMonths });
  } else {
    return diffYears === 1 ? t('common.yearAgo') : t('common.yearsAgo', { count: diffYears });
  }
}

/**
 * Format date to relative time with fallback to absolute date
 * (e.g., "hace 2 horas" or "15 ene 2024" for older dates)
 *
 * @param date - Date string or Date object
 * @returns Relative time string or formatted date
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'hace unos segundos';
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  if (diffHour < 24) return `hace ${diffHour} hora${diffHour !== 1 ? 's' : ''}`;
  if (diffDay < 30) return `hace ${diffDay} día${diffDay !== 1 ? 's' : ''}`;

  return formatDate(dateObj, { year: 'numeric', month: 'short', day: 'numeric' });
}
