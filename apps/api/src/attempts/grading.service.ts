import { Injectable } from '@nestjs/common';
import { QuestionType } from '@prisma/client';

interface GradeResult {
  questionId: string;
  answer: any;
  isCorrect: boolean | null;
  pointEarned: number | null;
  timeSpent: number;
}

@Injectable()
export class GradingService {
  gradeAttempt(
    answers: any[],
    examQuestions: any[],
  ): GradeResult[] {
    return answers.map((answerEntry) => {
      const eq = examQuestions.find((q) => q.questionId === answerEntry.questionId);
      if (!eq) {
        return { ...answerEntry, isCorrect: null, pointEarned: 0 };
      }

      const result = this.gradeAnswer(eq.question, answerEntry.answer, eq);
      return {
        questionId: answerEntry.questionId,
        answer: answerEntry.answer,
        timeSpent: answerEntry.timeSpent ?? 0,
        ...result,
      };
    });
  }

  gradeAnswer(
    question: any,
    userAnswer: any,
    examQuestion: any,
  ): { isCorrect: boolean | null; pointEarned: number | null } {
    const point = examQuestion.point;
    const config = question.config as any;

    switch (question.type as QuestionType) {
      case QuestionType.MULTIPLE_CHOICE: {
        const isCorrect = userAnswer === config.correctAnswer;
        return { isCorrect, pointEarned: isCorrect ? point : 0 };
      }

      case QuestionType.MULTIPLE_SELECT: {
        const correctAnswers: string[] = [...(config.correctAnswers ?? [])].sort();
        const userAnswers: string[] = [...(Array.isArray(userAnswer) ? userAnswer : [])].sort();
        const isCorrect = JSON.stringify(correctAnswers) === JSON.stringify(userAnswers);

        if (isCorrect) {
          return { isCorrect: true, pointEarned: point };
        }

        const correctSelected = userAnswers.filter((a) => correctAnswers.includes(a)).length;
        const wrongSelected = userAnswers.filter((a) => !correctAnswers.includes(a)).length;
        const totalOptions = (config.options ?? []).length;
        const partial = Math.max(
          0,
          correctSelected / correctAnswers.length - wrongSelected / totalOptions,
        );

        return { isCorrect: false, pointEarned: Math.round(partial * point * 100) / 100 };
      }

      case QuestionType.TRUE_FALSE: {
        const isCorrect = userAnswer === config.correctAnswer;
        return { isCorrect, pointEarned: isCorrect ? point : 0 };
      }

      case QuestionType.FILL_BLANK: {
        const normalize = (s: string) => {
          let str = String(s).trim();
          if (!config.caseSensitive) str = str.toLowerCase();
          return str;
        };
        const isCorrect = (config.correctAnswers ?? []).some(
          (ans: string) => normalize(ans) === normalize(userAnswer ?? ''),
        );
        return { isCorrect, pointEarned: isCorrect ? point : 0 };
      }

      case QuestionType.ESSAY: {
        return { isCorrect: null, pointEarned: null };
      }

      default:
        return { isCorrect: null, pointEarned: 0 };
    }
  }
}
