import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
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
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // React Hooks rules - critical for preventing infinite loops
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': [
        'warn',
        {
          // Warn about missing dependencies but allow intentional omissions
          additionalHooks: '(useMemo|useCallback)',
        },
      ],
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
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
    },
  },
)
