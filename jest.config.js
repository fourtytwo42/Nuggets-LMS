const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/tests/e2e/', // E2E tests should be run with Playwright, not Jest
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx', // Exclude Next.js page files from coverage
    '!src/app/api/**/*.ts', // Exclude API routes from coverage (tested via integration tests)
  ],
  coverageThreshold: {
    global: {
      branches: 85, // Allow slightly lower threshold for singleton patterns
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chokidar|pdf-parse)/)',
  ],
};

module.exports = createJestConfig(customJestConfig);
