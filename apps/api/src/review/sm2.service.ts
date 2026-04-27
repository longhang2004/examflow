import { Injectable } from '@nestjs/common';

export interface SM2Input {
  easeFactor: number;
  interval: number;
  repetitions: number;
  quality: number;
}

export interface SM2Output {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
}

@Injectable()
export class Sm2Service {
  calculate(input: SM2Input, now = new Date()): SM2Output {
    const quality = Math.max(0, Math.min(5, Math.round(input.quality)));
    let easeFactor = input.easeFactor;
    let interval = input.interval;
    let repetitions = input.repetitions;

    if (quality < 3) {
      repetitions = 0;
      interval = 1;
    } else {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.max(1, Math.round(interval * easeFactor));
      }

      const diff = 5 - quality;
      easeFactor = Math.max(
        1.3,
        easeFactor + 0.1 - diff * (0.08 + diff * 0.02),
      );
      repetitions += 1;
    }

    const nextReviewAt = new Date(now);
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    return { easeFactor, interval, repetitions, nextReviewAt };
  }
}
