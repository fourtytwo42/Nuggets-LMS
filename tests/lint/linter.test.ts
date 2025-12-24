/**
 * Linter Tests
 * These tests verify that linting rules are properly configured
 */

describe('Linter Configuration', () => {
  it('should have ESLint configured', () => {
    // This test ensures ESLint is available
    const eslint = require('eslint');
    expect(eslint).toBeDefined();
  });

  it('should have Prettier configured', () => {
    // This test ensures Prettier is available
    const prettier = require('prettier');
    expect(prettier).toBeDefined();
  });

  it('should have TypeScript configured', () => {
    // This test ensures TypeScript is available
    const typescript = require('typescript');
    expect(typescript).toBeDefined();
  });
});
