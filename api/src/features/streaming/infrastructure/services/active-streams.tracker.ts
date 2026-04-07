import { Injectable } from '@nestjs/common';

@Injectable()
export class ActiveStreamsTracker {
  private current = 0;
  private total = 0;

  increment(): void {
    this.current++;
    this.total++;
  }

  decrement(): void {
    if (this.current > 0) this.current--;
  }

  get activeCount(): number {
    return this.current;
  }

  get totalServed(): number {
    return this.total;
  }
}
