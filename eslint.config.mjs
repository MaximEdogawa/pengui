import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/node_modules/**",
      "**/*.d.ts",
      "**/next-env.d.ts",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/playwright-ct-report/**",
      "**/test-results/**",
      "**/*.config.{js,mjs,cjs}",
      "**/next.config.*",
      "**/postcss.config.*",
      "**/tailwind.config.*",
      "**/public/wasm/**",
      "**/crates/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // App Style Guide Rules - matches style-guide-rules configuration
      "max-lines": ["error", { max: 1000, skipBlankLines: true, skipComments: true }],
      "no-console": "error", // Disallow all console usage - use logger instead
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "prefer-template": "error",
      "no-useless-return": "error",
      "no-useless-concat": "error",
      "no-loop-func": "error",
      "no-iterator": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ForStatement",
          message:
            "Use functional programming methods like map, filter, reduce instead of for loops",
        },
        {
          selector: "WhileStatement",
          message: "Use functional programming methods or recursion instead of while loops",
        },
        {
          selector: "DoWhileStatement",
          message: "Use functional programming methods or recursion instead of do-while loops",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          args: "none",
        },
      ],
      // Code Duplication Detection Rules
      "no-duplicate-imports": "warn", // Warn on duplicate imports from the same module
      "no-duplicate-case": "error", // Disallow duplicate case labels in switch statements
      "no-dupe-keys": "error", // Disallow duplicate keys in object literals
      "no-dupe-class-members": "error", // Disallow duplicate class member names
      "no-dupe-else-if": "warn", // Disallow duplicate conditions in if-else-if chains
      // Clean Code Principles (Robert C. Martin) - Fast Built-in Rules
      "max-params": ["warn", 6],
      complexity: ["warn", { max: 40 }],
      "max-lines-per-function": [
        "warn",
        {
          max: 350,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
      "max-depth": ["warn", 4],
      "max-statements": ["warn", { max: 55 }],
      // React Hooks rules - critical for preventing infinite loops
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": [
        "warn",
        {
          additionalHooks: "(useMemo|useCallback)",
        },
      ],
    },
  },
  // FSD Layer Rules: Enforce import boundaries per layer
  ...[
    // app: Can import from all layers (no restrictions)
    { files: ["src/app/**/*.{ts,tsx}"], rules: {} },

    // widgets: Can import from features, entities, shared (not widgets, app)
    {
      files: ["src/widgets/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/widgets/**", "@/app/**"],
                message: "Widgets cannot import from widgets or app",
                allowTypeImports: true,
              },
            ],
          },
        ],
      },
    },

    // features: Can import from entities, shared (not widgets, app)
    {
      files: ["src/features/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/widgets/**", "@/app/**"],
                message: "Features cannot import from widgets or app",
                allowTypeImports: true,
              },
            ],
          },
        ],
      },
    },

    // entities: Can only import from shared (not widgets, features, app)
    {
      files: ["src/entities/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@/widgets/**", "@/features/**", "@/app/**"],
                message: "Entities can only import from shared",
                allowTypeImports: true,
              },
            ],
          },
        ],
      },
    },
  ],
];
