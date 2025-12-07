/**
 * Date utilities for formatting relative times and other date operations
 */

export type Locale = 'es' | 'en';

const translations = {
  es: {
    now: 'ahora',
    minutesAgo: (n: number) => `hace ${n}m`,
    hoursAgo: (n: number) => `hace ${n}h`,
    daysAgo: (n: number) => `hace ${n}d`,
    weeksAgo: (n: number) => `hace ${n}sem`,
    monthsAgo: (n: number) => `hace ${n}mes`,
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
 * @param options - Intl.DateTimeFormatOptions
 * @param locale - Locale string (default: 'es-ES')
 * @returns Formatted date string or fallback if undefined
 */
export function formatDate(
  dateInput?: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
  locale = 'es-ES'
): string {
  if (!dateInput) return 'Desconocida';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Formats a date to show date and time
 *
 * @param dateInput - ISO date string or Date object
 * @param locale - Locale string (default: 'es-ES')
 * @returns Formatted datetime string
 */
export function formatDateTime(dateInput: string | Date, locale = 'es-ES'): string {
  return formatDate(dateInput, { dateStyle: 'medium', timeStyle: 'short' }, locale);
}
