import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/next-env.d.ts',
      '**/coverage/**',
      '**/*.config.{js,mjs,cjs}',
      '**/next.config.*',
      '**/postcss.config.*',
      '**/tailwind.config.*',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // App Style Guide Rules - matches style-guide-rules configuration
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }], // Allow console.warn and console.error for logger utilities
      'no-debugger': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'no-loop-func': 'error',
      'no-iterator': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForStatement',
          message:
            'Use functional programming methods like map, filter, reduce instead of for loops',
        },
        {
          selector: 'WhileStatement',
          message: 'Use functional programming methods or recursion instead of while loops',
        },
        {
          selector: 'DoWhileStatement',
          message: 'Use functional programming methods or recursion instead of do-while loops',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          args: 'none',
        },
      ],
      // Clean Code Principles (Robert C. Martin) - Fast Built-in Rules
      // These rules are fast because they use built-in ESLint analyzers (no AST traversal overhead)
      // Maximum 3 parameters per function (Clean Code: "The ideal number of arguments is zero")
      'max-params': ['warn', 5], // Clean Code: functions should have 3 or fewer parameters
      // Cyclomatic complexity - measures decision points (fast built-in rule)
      complexity: ['warn', { max: 50 }], // Clean Code: keep functions simple (adjusted to 20 for practicality)
      // Function length - Clean Code recommends ~20 lines, we use 50 for React components
      'max-lines-per-function': [
        'warn',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      // Nesting depth - Clean Code: avoid deep nesting (fast built-in rule)
      'max-depth': ['warn', 4], // Max 4 levels of nesting (Clean Code: prefer flat structures)
      // Maximum statements per function (fast built-in rule)
      'max-statements': ['warn', { max: 50 }], // Clean Code: functions should do one thing (adjusted for React)
      // React Hooks rules - critical for preventing infinite loops
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          // Warn about missing dependencies but allow intentional omissions
          additionalHooks: '(useMemo|useCallback)',
        },
      ],
    },
  },
]
