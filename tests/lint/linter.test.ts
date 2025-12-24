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

  it('should have TypeScript configured', () => {
    // This test ensures TypeScript is available
    const typescript = require('typescript');
    expect(typescript).toBeDefined();
  });

  it('should have Prettier config file', () => {
    // Check for Prettier config file instead of requiring the module
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), '.prettierrc');
    const configExists = fs.existsSync(configPath) || fs.existsSync(configPath + '.json');
    expect(configExists).toBe(true);
  });
});
