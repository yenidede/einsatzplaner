import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/build/**',
      '**/dist/**',
      '**/src/generated/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      'next-env.d.ts',
      '!eslint.config.mjs', // Don't ignore this file itself
    ],
  },
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'plugin:react-hooks/recommended'
  ),
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
];

export default eslintConfig;
