import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

describe('AI Provider Compliance Guard (Section 4 — Gemini Only)', () => {
  const FORBIDDEN_AI_TOKENS = [
    'openai',
    'anthropic',
    'elevenlabs',
    'whisper',
    'langchain',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'ELEVENLABS_API_KEY',
  ];

  function scanDirectory(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (
        file === 'node_modules' ||
        file === 'dist' ||
        file === '.git' ||
        file === '.system_generated' ||
        file === 'brain' ||
        file === '.turbo'
      ) {
        continue;
      }

      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDirectory(fullPath, fileList);
      } else if (/\.(ts|tsx|js|mjs|py|env|json)$/.test(file) && !file.endsWith('.test.ts')) {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  it('guarantees zero references or imports of forbidden third-party AI providers', () => {
    const packagesDir = path.resolve(__dirname, '../../');
    const sourceFiles = scanDirectory(packagesDir);
    const violations: { file: string; token: string; line: number }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const token of FORBIDDEN_AI_TOKENS) {
          // Check for token as case-insensitive word
          const regex = new RegExp(`\\b${token}\\b`, 'i');
          if (regex.test(line)) {
            // Ignore audit reports or this test file
            if (filePath.includes('PHASE_0_AUDIT_REPORT') || filePath.includes('ai-provider-audit')) {
              continue;
            }
            violations.push({ file: path.relative(packagesDir, filePath), token, line: i + 1 });
          }
        }
      }
    }

    if (violations.length > 0) {
      console.error('Forbidden AI Provider violations detected:', violations);
    }

    assert.strictEqual(
      violations.length,
      0,
      `Expected 0 forbidden AI provider references, found ${violations.length}`
    );
  });
});
