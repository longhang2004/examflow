module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'attempts/anticheat.service.ts',
    'attempts/grading.service.ts',
    'auth/auth.service.ts',
    'review/sm2.service.ts',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testEnvironment: 'node',
};
