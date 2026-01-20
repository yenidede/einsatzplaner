import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import { rules } from 'eslint-plugin-react-hooks';

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
      '**/src/generated/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react-hooks/rules-of-hooks': rules['rules-of-hooks'],
      'react-hooks/exhaustive-deps': rules['exhaustive-deps'],
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  ...compat.extends(
    'next/core-web-vitals',
    'next/typescript',
    'plugin:react-hooks/recommended'
  ),
];

export default eslintConfig;
