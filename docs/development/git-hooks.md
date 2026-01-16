# Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality before commits.

## Pre-commit Hook

The pre-commit hook automatically runs on every `git commit` and executes three checks:

1. **Lint & Type Check** - Runs ESLint and TypeScript type checking on staged files
2. **Build** - Ensures the project builds successfully
3. **Test** - Runs the test suite

### What Gets Checked

#### 1. Lint & Type Check (via lint-staged)
- **ESLint**: All staged `.ts`, `.tsx`, `.js`, and `.jsx` files are linted
- **Auto-fix**: Automatically fixes ESLint issues that can be auto-fixed
- **TypeScript**: Type checking on staged `.ts` and `.tsx` files
- **React Hooks**: Enforces React Hooks rules to prevent common mistakes

#### 2. Build Check
- Runs `bun run build` to ensure the project compiles successfully
- Prevents committing code that breaks the build

#### 3. Test Suite
- Runs `bun run test` to execute all tests
- Ensures no regressions are introduced

### Bypassing the Hook

If you need to bypass the pre-commit hook (not recommended), use:

```bash
git commit --no-verify -m "your message"
```

⚠️ **Warning**: Only bypass hooks when absolutely necessary, as this can introduce code quality issues.

## Configuration

### Husky

Husky configuration is in `.husky/pre-commit`. The hook is automatically installed when you run:

```bash
bun install
```

The `prepare` script in `package.json` runs `husky install` automatically.

### lint-staged

Configuration is in `package.json` under the `lint-staged` key:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --config eslint.config.mjs --fix",
      "bunx tsc --noEmit --pretty"
    ],
    "*.{js,jsx}": [
      "eslint --config eslint.config.mjs --fix"
    ]
  }
}
```

This ensures:
- Only staged files are checked (faster)
- Auto-fixes are applied automatically
- Type checking runs on TypeScript files

## Test Setup

Currently, the test command is a placeholder. To set up tests:

1. Install a test framework (e.g., Vitest, Jest, or Bun's built-in test runner)
2. Update the `test` script in `package.json`
3. Create test files with `.test.ts` or `.spec.ts` extensions

Example with Bun's test runner:

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch"
  }
}
```

## Troubleshooting

### Hook Not Running

If the pre-commit hook isn't running:

1. Ensure Husky is installed: `bun run prepare`
2. Check that `.husky/pre-commit` exists and is executable
3. Verify Git hooks are enabled: `git config core.hooksPath`

### Hook Failing

If the hook fails:

1. **ESLint errors**: Fix the errors shown in the output, or run `bun run lint:fix` manually
2. **Type errors**: Fix TypeScript errors shown in the output, or run `bun run type-check` manually
3. **Build errors**: Fix build errors shown in the output, or run `bun run build` manually
4. **Test failures**: Fix failing tests, or run `bun run test` manually

### Common Issues

- **"command not found"**: Ensure dependencies are installed with `bun install`
- **"permission denied"**: Make the hook executable: `chmod +x .husky/pre-commit`
- **Slow hook execution**: This is normal for build and test. Consider using `--no-verify` only when necessary

## Manual Checks

You can run the same checks manually:

```bash
# Lint all files
bun run lint

# Lint and auto-fix
bun run lint:fix

# Type check
bun run type-check

# Build
bun run build

# Test
bun run test
```

## Performance Tips

- **lint-staged** only checks staged files, making linting faster
- Build and test checks run on the entire project (necessary for correctness)
- If hooks are too slow, consider:
  - Running tests in watch mode during development
  - Using `--no-verify` for WIP commits (then run checks before final commit)

## Related Documentation

- [Infinite Loop Guardrails](./infinite-loop-guardrails.md) - Preventing infinite loops in useEffect hooks
- [ESLint Configuration](../eslint.config.mjs) - Project ESLint rules
