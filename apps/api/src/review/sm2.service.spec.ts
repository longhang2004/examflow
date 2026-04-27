import { Sm2Service } from './sm2.service';

describe('Sm2Service', () => {
  let service: Sm2Service;
  const now = new Date('2026-04-27T00:00:00.000Z');

  beforeEach(() => {
    service = new Sm2Service();
  });

  it('resets repetitions and interval when quality is below 3', () => {
    const result = service.calculate(
      { easeFactor: 2.5, interval: 10, repetitions: 4, quality: 0 },
      now,
    );

    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.nextReviewAt.getTime()).toBeGreaterThan(now.getTime());
  });

  it('increases intervals over repeated perfect reviews', () => {
    let state = { easeFactor: 2.5, interval: 1, repetitions: 0, quality: 5 };

    const first = service.calculate(state, now);
    const second = service.calculate({ ...first, quality: 5 }, now);
    const third = service.calculate({ ...second, quality: 5 }, now);

    expect(first.interval).toBe(1);
    expect(second.interval).toBe(6);
    expect(third.interval).toBeGreaterThan(second.interval);
    expect(third.easeFactor).toBeGreaterThan(2.5);
  });

  it('never lets easeFactor drop below 1.3', () => {
    const result = service.calculate(
      { easeFactor: 1.31, interval: 20, repetitions: 5, quality: 3 },
      now,
    );

    expect(result.easeFactor).toBe(1.3);
  });

  it('keeps interval growing while reducing easeFactor for difficult correct recall', () => {
    const result = service.calculate(
      { easeFactor: 2.5, interval: 6, repetitions: 2, quality: 3 },
      now,
    );

    expect(result.interval).toBe(15);
    expect(result.easeFactor).toBeLessThan(2.5);
    expect(result.repetitions).toBe(3);
  });
});
