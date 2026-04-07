import { ActiveStreamsTracker } from './active-streams.tracker';

describe('ActiveStreamsTracker', () => {
  let tracker: ActiveStreamsTracker;

  beforeEach(() => {
    tracker = new ActiveStreamsTracker();
  });

  it('should start with 0 active and 0 total', () => {
    expect(tracker.activeCount).toBe(0);
    expect(tracker.totalServed).toBe(0);
  });

  it('should increment both active and total', () => {
    tracker.increment();

    expect(tracker.activeCount).toBe(1);
    expect(tracker.totalServed).toBe(1);
  });

  it('should decrement active but not total', () => {
    tracker.increment();
    tracker.increment();
    tracker.decrement();

    expect(tracker.activeCount).toBe(1);
    expect(tracker.totalServed).toBe(2);
  });

  it('should not go below 0 on decrement', () => {
    tracker.decrement();
    tracker.decrement();

    expect(tracker.activeCount).toBe(0);
    expect(tracker.totalServed).toBe(0);
  });

  it('should track total across multiple open/close cycles', () => {
    // Simulate 5 streams opened and closed
    for (let i = 0; i < 5; i++) {
      tracker.increment();
      tracker.decrement();
    }

    expect(tracker.activeCount).toBe(0);
    expect(tracker.totalServed).toBe(5);
  });

  it('should handle concurrent streams correctly', () => {
    tracker.increment(); // stream 1
    tracker.increment(); // stream 2
    tracker.increment(); // stream 3

    expect(tracker.activeCount).toBe(3);
    expect(tracker.totalServed).toBe(3);

    tracker.decrement(); // stream 1 ends
    tracker.decrement(); // stream 2 ends

    expect(tracker.activeCount).toBe(1);
    expect(tracker.totalServed).toBe(3);

    tracker.increment(); // stream 4

    expect(tracker.activeCount).toBe(2);
    expect(tracker.totalServed).toBe(4);
  });
});
