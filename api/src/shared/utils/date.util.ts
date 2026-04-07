export class DateUtil {
  static now(): Date {
    return new Date();
  }

  static fromTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  static fromISOString(dateString: string): Date {
    return new Date(dateString);
  }

  static isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  static isPast(date: Date): boolean {
    return date < this.now();
  }

  static isFuture(date: Date): boolean {
    return date > this.now();
  }

  static diffInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}