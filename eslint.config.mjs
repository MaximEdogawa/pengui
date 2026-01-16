// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default [{
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
    '**/storybook-static/**',
    '**/.storybook/**',
    ],
}, eslint.configs.recommended, 
// TypeScript ESLint - exclude Storybook from type checking
...tseslint.configs.recommended.map((config) => ({
  ...config,
  ignores: [...(config.ignores || []), 'storybook/**/*', '.storybook/**/*'],
})),
{
  files: ['**/*.{ts,tsx,js,jsx}'],
  ignores: ['storybook/**/*', '.storybook/**/*'],
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
    // Code Duplication Detection Rules
    'no-duplicate-imports': 'warn', // Warn on duplicate imports from the same module
    'no-duplicate-case': 'error', // Disallow duplicate case labels in switch statements
    'no-dupe-keys': 'error', // Disallow duplicate keys in object literals
    'no-dupe-class-members': 'error', // Disallow duplicate class member names
    'no-dupe-else-if': 'warn', // Disallow duplicate conditions in if-else-if chains
    // Clean Code Principles (Robert C. Martin) - Fast Built-in Rules
    // These rules are fast because they use built-in ESLint analyzers (no AST traversal overhead)
    // Maximum 3 parameters per function (Clean Code: "The ideal number of arguments is zero")
    'max-params': ['warn', 4], // Clean Code: functions should have 4 or fewer parameters
    // Cyclomatic complexity - measures decision points (fast built-in rule)
    complexity: ['warn', { max: 30 }], // Clean Code: keep functions simple (adjusted to 30 for practicality)
    // Function length - Clean Code recommends ~20 lines, we use 185 for React components
    'max-lines-per-function': [
      'warn',
      {
        max: 185,
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
    // FSD Layer Import Boundaries
    // Hierarchy: app → widgets → features → entities → shared
    // Each layer can only import from layers below it in the hierarchy
  },
}, 
// FSD Layer Rules: Enforce import boundaries per layer
...[
  // app: Can import from all layers (no restrictions)
  { files: ['src/app/**/*.{ts,tsx}'], rules: {} },
  
  // widgets: Can import from features, entities, shared (not widgets, app)
  { 
    files: ['src/widgets/**/*.{ts,tsx}'], 
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/widgets/**', '@/app/**'], message: 'Widgets cannot import from widgets or app', allowTypeImports: true }],
      }],
    },
  },
  
  // features: Can import from entities, shared (not widgets, app)
  { 
    files: ['src/features/**/*.{ts,tsx}'], 
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/widgets/**', '@/app/**'], message: 'Features cannot import from widgets or app', allowTypeImports: true }],
      }],
    },
  },
  
  // entities: Can only import from shared (not widgets, features, app)
  { 
    files: ['src/entities/**/*.{ts,tsx}'], 
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/widgets/**', '@/features/**', '@/app/**'], message: 'Entities can only import from shared', allowTypeImports: true }],
      }],
    },
  },
  
  // shared: Cannot import from any other layer (foundation layer)
  { 
    files: ['src/shared/**/*.{ts,tsx}'], 
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['@/widgets/**', '@/features/**', '@/entities/**', '@/app/**'], message: 'Shared cannot import from other layers', allowTypeImports: true }],
      }],
    },
  },
],
// Storybook-specific rules (minimal linting for .stories files)
// Disable TypeScript type checking - Storybook handles this via its own build system
{
  files: ['storybook/**/*.stories.{ts,tsx,js,jsx}', '.storybook/**/*.{ts,tsx,js,jsx}'],
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      project: false, // Disable TypeScript project-based type checking
      projectService: false, // Disable TypeScript project service
    },
    globals: {
      console: 'readonly',
      setTimeout: 'readonly',
      clearTimeout: 'readonly',
      setInterval: 'readonly',
      clearInterval: 'readonly',
      window: 'readonly',
      document: 'readonly',
      process: 'readonly',
      global: 'readonly',
      Buffer: 'readonly',
      __dirname: 'readonly',
      __filename: 'readonly',
    },
  },
  plugins: {
    storybook: storybook,
  },
  rules: {
    // Minimal Storybook rules - only essential checks
    'storybook/hierarchy-separator': 'warn',
    'storybook/default-exports': 'error',
    'storybook/no-title-property-in-meta': 'off', // Title is needed for Storybook organization
    // Allow console in stories for debugging
    'no-console': 'off',
    // Relax complexity for story files
    complexity: 'off',
    'max-lines-per-function': 'off',
    'max-statements': 'off',
    'max-lines': 'off',
    'max-depth': 'off',
    'max-params': 'off',
    // Disable ALL TypeScript-specific rules that require type checking (handled by Storybook's build)
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    // Disable import resolution errors (Storybook handles this via Vite)
    'import/no-unresolved': 'off',
  },
},
...storybook.configs["flat/recommended"]];
