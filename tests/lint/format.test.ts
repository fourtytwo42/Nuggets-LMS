/**
 * Format Tests
 * These tests verify code formatting
 */

import prettier from 'prettier';
import fs from 'fs';
import path from 'path';

describe('Code Formatting', () => {
  const srcFiles = [
    'src/lib/utils/index.ts',
    'src/lib/auth/jwt.ts',
    'src/components/ui/Button.tsx',
  ];

  it('should format TypeScript files correctly', async () => {
    for (const file of srcFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const formatted = await prettier.format(content, {
          parser: file.endsWith('.tsx') ? 'typescript' : 'typescript',
          ...(await prettier.resolveConfig(filePath)),
        });

        // Check if file is already formatted
        expect(content).toBe(formatted);
      }
    }
  });

  it('should have Prettier config', () => {
    const configPath = path.join(process.cwd(), '.prettierrc');
    const configExists = fs.existsSync(configPath) || fs.existsSync(configPath + '.json');
    expect(configExists).toBe(true);
  });
});
