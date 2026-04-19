import { PrismaClient, QuestionType, ExamStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Demo123!', 12);

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@demo.com' },
    update: {},
    create: {
      email: 'teacher@demo.com',
      passwordHash,
      displayName: 'Demo Teacher',
      role: 'TEACHER',
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: 'student@demo.com' },
    update: {},
    create: {
      email: 'student@demo.com',
      passwordHash,
      displayName: 'Demo Student',
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@demo.com' },
    update: {},
    create: {
      email: 'student2@demo.com',
      passwordHash,
      displayName: 'Demo Student 2',
      role: 'STUDENT',
    },
  });

  const questions = await Promise.all([
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.MULTIPLE_CHOICE,
        content: 'What is the capital of Vietnam?',
        config: {
          options: [
            { id: 'a', text: 'Ho Chi Minh City' },
            { id: 'b', text: 'Hanoi' },
            { id: 'c', text: 'Da Nang' },
            { id: 'd', text: 'Hue' },
          ],
          correctAnswer: 'b',
          explanation: 'Hanoi is the capital of Vietnam.',
        },
        tags: ['geography', 'vietnam'],
        difficulty: 1,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.TRUE_FALSE,
        content: 'The Earth is the third planet from the Sun.',
        config: { correctAnswer: true, explanation: 'Earth is indeed the third planet.' },
        tags: ['science', 'astronomy'],
        difficulty: 1,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.MULTIPLE_SELECT,
        content: 'Which of the following are programming languages?',
        config: {
          options: [
            { id: 'a', text: 'Python' },
            { id: 'b', text: 'HTML' },
            { id: 'c', text: 'JavaScript' },
            { id: 'd', text: 'CSS' },
          ],
          correctAnswers: ['a', 'c'],
          explanation: 'Python and JavaScript are programming languages. HTML and CSS are markup/style languages.',
        },
        tags: ['programming', 'tech'],
        difficulty: 2,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.FILL_BLANK,
        content: 'The chemical symbol for water is ___.',
        config: {
          correctAnswers: ['H2O', 'h2o'],
          caseSensitive: false,
          explanation: 'Water is composed of 2 hydrogen atoms and 1 oxygen atom.',
        },
        tags: ['chemistry', 'science'],
        difficulty: 1,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.ESSAY,
        content: 'Describe the water cycle in detail, including evaporation, condensation, and precipitation.',
        config: {
          rubric: ['Mentions evaporation', 'Mentions condensation', 'Mentions precipitation'],
          maxWords: 300,
          explanation: 'The water cycle includes evaporation, condensation, and precipitation.',
        },
        tags: ['science', 'environment'],
        difficulty: 3,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.MULTIPLE_CHOICE,
        content: 'Which planet is known as the Red Planet?',
        config: {
          options: [
            { id: 'a', text: 'Venus' },
            { id: 'b', text: 'Mars' },
            { id: 'c', text: 'Jupiter' },
            { id: 'd', text: 'Saturn' },
          ],
          correctAnswer: 'b',
          explanation: 'Mars is known as the Red Planet due to its reddish appearance.',
        },
        tags: ['science', 'astronomy'],
        difficulty: 1,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.TRUE_FALSE,
        content: 'The speed of light is approximately 300,000 km/s.',
        config: { correctAnswer: true, explanation: 'The speed of light in vacuum is ~299,792 km/s.' },
        tags: ['physics', 'science'],
        difficulty: 2,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.FILL_BLANK,
        content: 'The largest ocean on Earth is the ___ Ocean.',
        config: {
          correctAnswers: ['Pacific', 'pacific'],
          caseSensitive: false,
          explanation: 'The Pacific Ocean is the largest and deepest ocean.',
        },
        tags: ['geography'],
        difficulty: 1,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.MULTIPLE_SELECT,
        content: 'Which of these are noble gases?',
        config: {
          options: [
            { id: 'a', text: 'Helium' },
            { id: 'b', text: 'Oxygen' },
            { id: 'c', text: 'Neon' },
            { id: 'd', text: 'Nitrogen' },
          ],
          correctAnswers: ['a', 'c'],
          explanation: 'Helium and Neon are noble gases. Oxygen and Nitrogen are not.',
        },
        tags: ['chemistry', 'science'],
        difficulty: 2,
        isPublic: true,
      },
    }),
    prisma.question.create({
      data: {
        creatorId: teacher.id,
        type: QuestionType.MULTIPLE_CHOICE,
        content: 'What is 15 multiplied by 12?',
        config: {
          options: [
            { id: 'a', text: '150' },
            { id: 'b', text: '180' },
            { id: 'c', text: '170' },
            { id: 'd', text: '200' },
          ],
          correctAnswer: 'b',
          explanation: '15 x 12 = 180',
        },
        tags: ['math'],
        difficulty: 1,
        isPublic: true,
      },
    }),
  ]);

  // Exam 1: General Knowledge — 30 minute timer, first 5 questions
  const exam1 = await prisma.exam.create({
    data: {
      title: 'General Knowledge Quiz',
      description: 'Test your general knowledge with a mix of question types!',
      creatorId: teacher.id,
      config: {
        duration: 30,
        maxAttempts: 3,
        shuffleQuestions: false,
        shuffleOptions: false,
        showResultAfter: true,
        startAt: null,
        endAt: null,
      },
      accessCode: 'QUIZ01',
      status: ExamStatus.PUBLISHED,
    },
  });

  // Exam 2: Science Practice — no time limit, questions 5-9
  const exam2 = await prisma.exam.create({
    data: {
      title: 'Science Practice',
      description: 'Practice your science skills. No time limit.',
      creatorId: teacher.id,
      config: {
        duration: null,
        maxAttempts: 5,
        shuffleQuestions: true,
        shuffleOptions: false,
        showResultAfter: true,
        startAt: null,
        endAt: null,
      },
      accessCode: 'SCI001',
      status: ExamStatus.PUBLISHED,
    },
  });

  // Link questions to Exam 1 (first 5, indices 0-4)
  for (let i = 0; i < 5; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: exam1.id,
        questionId: questions[i].id,
        order: i + 1,
        point: 2,
      },
    });
  }

  // Link questions to Exam 2 (next 5, indices 5-9)
  for (let i = 5; i < 10; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: exam2.id,
        questionId: questions[i].id,
        order: i - 4,
        point: 2,
      },
    });
  }

  // --- Attempt 1: student1 completes Exam 1 (scores 8/10 = 80%) ---
  const exam1QuestionIds = questions.slice(0, 5).map((q) => q.id);
  await prisma.attempt.create({
    data: {
      examId: exam1.id,
      userId: student1.id,
      questionOrder: exam1QuestionIds,
      status: 'GRADED',
      startedAt: new Date(Date.now() - 25 * 60 * 1000),
      submittedAt: new Date(Date.now() - 5 * 60 * 1000),
      totalScore: 8,
      maxScore: 10,
      answers: [
        { questionId: exam1QuestionIds[0], answer: 'b', timeSpent: 30, isCorrect: true, pointEarned: 2 },
        { questionId: exam1QuestionIds[1], answer: true, timeSpent: 15, isCorrect: true, pointEarned: 2 },
        { questionId: exam1QuestionIds[2], answer: ['a', 'c'], timeSpent: 45, isCorrect: true, pointEarned: 2 },
        { questionId: exam1QuestionIds[3], answer: 'H2O', timeSpent: 20, isCorrect: true, pointEarned: 2 },
        { questionId: exam1QuestionIds[4], answer: 'The water cycle involves evaporation from water bodies, condensation in the atmosphere, and precipitation as rain.', timeSpent: 180, isCorrect: null, pointEarned: null },
      ],
    },
  });

  // --- Attempt 2: student2 completes Exam 1 (scores 4/10 = 40%) ---
  await prisma.attempt.create({
    data: {
      examId: exam1.id,
      userId: student2.id,
      questionOrder: exam1QuestionIds,
      status: 'GRADED',
      startedAt: new Date(Date.now() - 30 * 60 * 1000),
      submittedAt: new Date(Date.now() - 10 * 60 * 1000),
      totalScore: 4,
      maxScore: 10,
      answers: [
        { questionId: exam1QuestionIds[0], answer: 'a', timeSpent: 40, isCorrect: false, pointEarned: 0 },
        { questionId: exam1QuestionIds[1], answer: true, timeSpent: 10, isCorrect: true, pointEarned: 2 },
        { questionId: exam1QuestionIds[2], answer: ['a', 'b'], timeSpent: 55, isCorrect: false, pointEarned: 0 },
        { questionId: exam1QuestionIds[3], answer: 'H20', timeSpent: 25, isCorrect: false, pointEarned: 0 },
        { questionId: exam1QuestionIds[4], answer: 'Water evaporates and then rains.', timeSpent: 60, isCorrect: null, pointEarned: null },
      ],
    },
  });

  // --- Attempt 3: student1 completes Exam 2 (scores 6/10 = 60%) ---
  const exam2QuestionIds = questions.slice(5, 10).map((q) => q.id);
  await prisma.attempt.create({
    data: {
      examId: exam2.id,
      userId: student1.id,
      questionOrder: exam2QuestionIds,
      status: 'GRADED',
      startedAt: new Date(Date.now() - 60 * 60 * 1000),
      submittedAt: new Date(Date.now() - 40 * 60 * 1000),
      totalScore: 6,
      maxScore: 10,
      answers: [
        { questionId: exam2QuestionIds[0], answer: 'b', timeSpent: 20, isCorrect: true, pointEarned: 2 },
        { questionId: exam2QuestionIds[1], answer: false, timeSpent: 15, isCorrect: false, pointEarned: 0 },
        { questionId: exam2QuestionIds[2], answer: 'Pacific', timeSpent: 30, isCorrect: true, pointEarned: 2 },
        { questionId: exam2QuestionIds[3], answer: ['a', 'c'], timeSpent: 40, isCorrect: true, pointEarned: 2 },
        { questionId: exam2QuestionIds[4], answer: 'a', timeSpent: 25, isCorrect: false, pointEarned: 0 },
      ],
    },
  });

  console.log('Seed data created:');
  console.log('  teacher@demo.com / Demo123!');
  console.log('  student@demo.com / Demo123!');
  console.log('  student2@demo.com / Demo123!');
  console.log(`  Exam 1 (30min timer): QUIZ01`);
  console.log(`  Exam 2 (unlimited): SCI001`);
  console.log('  3 submitted attempts with grading results');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
