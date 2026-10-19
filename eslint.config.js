import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import schoolpilotNoNumericId from './eslint-rules/no-numeric-id.js';

const serviceDirectories = [
  'src/services/backend',
  'src/services/data',
  'src/services/database',
  'src/services/dataGeneration',
  'src/services/erpnext',
  'src/services/livestore',
  'src/services/sqlite',
  'src/services/sync',
  'src/services/tabs',
];

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      
      // Phase 6: Infinite Loop Prevention Rules
      // Enforce exhaustive dependencies in hooks
      'react-hooks/exhaustive-deps': 'error',
      
      // Enforce rules of hooks
      'react-hooks/rules-of-hooks': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // Prevent deep imports into service directories
            ...serviceDirectories.map(dir => ({
              group: [`${dir}/*/*`],
              message: 'Use the public API from the service directory index.',
            })),
            // Prevent deep relative imports (crossing module boundaries)
            {
              group: ['../../../*'],
              message: 'Use @/ alias for cross-module imports instead of deep relative paths.',
            },
            // Prevent importing from other modules' internals
            {
              group: ['@/modules/*/components/*'],
              message: 'Import from module barrel (@/modules/{module}) instead of internal component.',
            },
            {
              group: ['@/modules/*/services/*'],
              message: 'Import from module barrel (@/modules/{module}) instead of internal service.',
            },
            // Prevent cross-module data imports (module independence)
            {
              group: ['../../*/data/*'],
              message: 'Cross-module data imports are not allowed. Use useSharedData() hook instead.',
            },
            {
              group: ['../../*/data'],
              message: 'Cross-module data imports are not allowed. Use useSharedData() hook instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      schoolpilot: {
        rules: {
          'no-numeric-id': schoolpilotNoNumericId,
        },
      },
    },
    rules: {
      'schoolpilot/no-numeric-id': 'error',
    },
  }
);
