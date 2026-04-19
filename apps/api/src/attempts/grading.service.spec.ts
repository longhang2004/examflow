import { GradingService } from './grading.service';

describe('GradingService', () => {
  let service: GradingService;

  beforeEach(() => {
    service = new GradingService();
  });

  describe('gradeAnswer – MULTIPLE_CHOICE', () => {
    const question = {
      type: 'MULTIPLE_CHOICE',
      config: {
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
          { id: 'c', text: 'Option C' },
        ],
        correctAnswer: 'b',
      },
    };
    const examQuestion = { point: 10 };

    it('should award full points for correct answer', () => {
      const result = service.gradeAnswer(question, 'b', examQuestion);
      expect(result.isCorrect).toBe(true);
      expect(result.pointEarned).toBe(10);
    });

    it('should award 0 points for incorrect answer', () => {
      const result = service.gradeAnswer(question, 'a', examQuestion);
      expect(result.isCorrect).toBe(false);
      expect(result.pointEarned).toBe(0);
    });
  });

  describe('gradeAnswer – MULTIPLE_SELECT', () => {
    const question = {
      type: 'MULTIPLE_SELECT',
      config: {
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
          { id: 'c', text: 'C' },
          { id: 'd', text: 'D' },
        ],
        correctAnswers: ['a', 'c'],
      },
    };
    const examQuestion = { point: 10 };

    it('should award full points for exact match', () => {
      const result = service.gradeAnswer(question, ['a', 'c'], examQuestion);
      expect(result.isCorrect).toBe(true);
      expect(result.pointEarned).toBe(10);
    });

    it('should award full points for exact match regardless of order', () => {
      const result = service.gradeAnswer(question, ['c', 'a'], examQuestion);
      expect(result.isCorrect).toBe(true);
      expect(result.pointEarned).toBe(10);
    });

    it('should award partial points for partial correct answers', () => {
      const result = service.gradeAnswer(question, ['a'], examQuestion);
      expect(result.isCorrect).toBe(false);
      expect(result.pointEarned).toBeGreaterThan(0);
      expect(result.pointEarned).toBeLessThan(10);
    });

    it('should deduct for wrong selections', () => {
      const result = service.gradeAnswer(question, ['a', 'b'], examQuestion);
      expect(result.isCorrect).toBe(false);
      expect(result.pointEarned).toBeLessThan(10);
    });

    it('should handle empty answer', () => {
      const result = service.gradeAnswer(question, [], examQuestion);
      expect(result.isCorrect).toBe(false);
      expect(result.pointEarned).toBe(0);
    });

    it('should handle non-array answer gracefully', () => {
      const result = service.gradeAnswer(question, null, examQuestion);
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('gradeAnswer – TRUE_FALSE', () => {
    const question = {
      type: 'TRUE_FALSE',
      config: { correctAnswer: true },
    };
    const examQuestion = { point: 5 };

    it('should grade true/false correctly', () => {
      expect(service.gradeAnswer(question, true, examQuestion)).toEqual({
        isCorrect: true,
        pointEarned: 5,
      });
      expect(service.gradeAnswer(question, false, examQuestion)).toEqual({
        isCorrect: false,
        pointEarned: 0,
      });
    });
  });

  describe('gradeAnswer – FILL_BLANK', () => {
    const question = {
      type: 'FILL_BLANK',
      config: {
        correctAnswers: ['Paris', 'paris'],
        caseSensitive: false,
      },
    };
    const examQuestion = { point: 8 };

    it('should accept case-insensitive correct answer', () => {
      const result = service.gradeAnswer(question, 'PARIS', examQuestion);
      expect(result.isCorrect).toBe(true);
      expect(result.pointEarned).toBe(8);
    });

    it('should trim whitespace', () => {
      const result = service.gradeAnswer(question, '  Paris  ', examQuestion);
      expect(result.isCorrect).toBe(true);
    });

    it('should reject incorrect answer', () => {
      const result = service.gradeAnswer(question, 'London', examQuestion);
      expect(result.isCorrect).toBe(false);
      expect(result.pointEarned).toBe(0);
    });

    it('should respect case sensitivity', () => {
      const csQuestion = {
        type: 'FILL_BLANK',
        config: { correctAnswers: ['Paris'], caseSensitive: true },
      };
      expect(service.gradeAnswer(csQuestion, 'paris', examQuestion).isCorrect).toBe(false);
      expect(service.gradeAnswer(csQuestion, 'Paris', examQuestion).isCorrect).toBe(true);
    });
  });

  describe('gradeAnswer – ESSAY', () => {
    const question = {
      type: 'ESSAY',
      config: { maxWords: 500 },
    };
    const examQuestion = { point: 20 };

    it('should return null for essay (requires manual grading)', () => {
      const result = service.gradeAnswer(question, 'My essay answer...', examQuestion);
      expect(result.isCorrect).toBeNull();
      expect(result.pointEarned).toBeNull();
    });
  });

  describe('gradeAttempt', () => {
    it('should grade all answers in an attempt', () => {
      const answers = [
        { questionId: 'q1', answer: 'b', timeSpent: 30 },
        { questionId: 'q2', answer: true, timeSpent: 15 },
        { questionId: 'q3', answer: 'nonexistent', timeSpent: 10 },
      ];

      const examQuestions = [
        {
          questionId: 'q1',
          question: {
            type: 'MULTIPLE_CHOICE',
            config: { correctAnswer: 'b', options: [] },
          },
          point: 10,
        },
        {
          questionId: 'q2',
          question: {
            type: 'TRUE_FALSE',
            config: { correctAnswer: true },
          },
          point: 5,
        },
      ];

      const results = service.gradeAttempt(answers, examQuestions);

      expect(results).toHaveLength(3);

      expect(results[0].isCorrect).toBe(true);
      expect(results[0].pointEarned).toBe(10);
      expect(results[0].timeSpent).toBe(30);

      expect(results[1].isCorrect).toBe(true);
      expect(results[1].pointEarned).toBe(5);

      expect(results[2].isCorrect).toBeNull();
      expect(results[2].pointEarned).toBe(0);
    });
  });
});
