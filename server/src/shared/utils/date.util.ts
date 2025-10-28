/**
 * DateUtil - Utilidad para manejo de fechas
 */
export class DateUtil {
  /**
   * Retorna la fecha/hora actual
   */
  static now(): Date {
    return new Date();
  }

  /**
   * Crea una fecha desde timestamp
   */
  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * Crea una fecha desde string ISO
   */
  static fromISOString(dateString: string): Date {
    return new Date(dateString);
  }

  /**
   * Compara si dos fechas son el mismo día
   */
  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  /**
   * Suma días a una fecha
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Suma horas a una fecha
   */
  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  /**
   * Verifica si una fecha es pasada
   */
  static isPast(date: Date): boolean {
    return date < this.now();
  }

  /**
   * Verifica si una fecha es futura
   */
  static isFuture(date: Date): boolean {
    return date > this.now();
  }

  /**
   * Obtiene la diferencia en días entre dos fechas
   */
  static diffInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}