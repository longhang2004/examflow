export type BillingFeatures = {
  maxExams?: number;
  maxQuestions?: number;
  maxAttemptPerExam?: number;
  maxTeachers?: number;
  maxStudents?: number;
  aiGeneratePerHour?: number;
  analytics?: 'basic' | 'advanced';
  marketplace?: boolean;
  antiCheat?: 'basic' | 'advanced';
  parentDashboard?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
};

export const DEFAULT_BILLING_PLANS = [
  {
    name: 'free',
    displayName: 'Free Teacher',
    price: 0,
    priceVND: 0,
    interval: 'month',
    features: {
      maxExams: 5,
      maxQuestions: 50,
      maxAttemptPerExam: 30,
      aiGeneratePerHour: 3,
      analytics: 'basic',
      marketplace: false,
      antiCheat: 'basic',
    },
  },
  {
    name: 'pro_teacher',
    displayName: 'Pro Teacher',
    price: 9.99,
    priceVND: 199000,
    interval: 'month',
    features: {
      maxExams: -1,
      maxQuestions: -1,
      maxAttemptPerExam: -1,
      aiGeneratePerHour: 30,
      analytics: 'advanced',
      marketplace: true,
      antiCheat: 'advanced',
      parentDashboard: true,
    },
  },
  {
    name: 'org_basic',
    displayName: 'Organization Basic',
    price: 29.99,
    priceVND: 599000,
    interval: 'month',
    features: {
      maxTeachers: 5,
      maxStudents: 200,
      maxExams: -1,
      maxQuestions: -1,
      aiGeneratePerHour: 100,
      analytics: 'advanced',
      marketplace: false,
      antiCheat: 'advanced',
      customBranding: false,
    },
  },
  {
    name: 'org_pro',
    displayName: 'Organization Pro',
    price: 79.99,
    priceVND: 1599000,
    interval: 'month',
    features: {
      maxTeachers: 20,
      maxStudents: 1000,
      aiGeneratePerHour: 500,
      analytics: 'advanced',
      marketplace: false,
      antiCheat: 'advanced',
      customBranding: true,
      prioritySupport: true,
    },
  },
] as const;

export const FREE_PLAN = DEFAULT_BILLING_PLANS[0];
