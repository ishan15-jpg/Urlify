import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Where Jest discovers tests
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],

  // TypeScript transformation
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'js', 'json'],

  // Clean mocks automatically between tests
  clearMocks: true,
  restoreMocks: true,

  // Coverage output
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};

export default config;
