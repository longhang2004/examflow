const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testRegex: '.*\\.test\\.tsx?$',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react-jsx',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@examflow/types$': '<rootDir>/../../packages/types/src/index.ts',
  },
};
