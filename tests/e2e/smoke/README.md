# Smoke Tests

Smoke tests are the fast critical-path checks that run on every pull request
(`.github/workflows/test.yml`, "Integration & Smoke Tests" job). They:

- run in well under a minute against the built app (`bun run start` on CI)
- need no wallet connection, no WalletConnect project id and no real funds
- assert something meaningful on every page they open (not just "body is not empty")

## Current smoke tests (`critical-paths.spec.ts`)

| Group | Test | What it proves |
| --- | --- | --- |
| Login page | renders heading, connect button, and sage link | `/login` renders the Pengui heading, the Connect Wallet button and the "Connect with Sage Wallet" link |
| Login page | connect button is present in the DOM | The WalletConnect entry point is rendered |
| Login page | title contains 'pengui' | The document title is set |
| Login page | no JS exceptions on load | No `pageerror` while loading `/login` |
| Home route | `/` renders the login page | `/` shows the same login UI as `/login` |
| App routes | `/trading`, `/offers`, `/wallet` load without a 500 error | Each route renders without a server error page or a `pageerror` (unauthenticated: the wallet guard redirects) |
| App routes | unknown route does not produce a 500 | The not-found route is served normally |

## Running

```bash
# what CI runs
bunx playwright test tests/e2e/smoke --project=chromium

# through the package script (same config, all of tests/e2e is the default)
bun run test:e2e tests/e2e/smoke
bun run test:e2e tests/e2e/smoke/critical-paths.spec.ts
```

Playwright starts `bun run dev` (or reuses a server on :3000; `bun run start` when `CI=1`) — see
`playwright.config.ts`.

## Adding a smoke test

- Test a critical user path only; everything authenticated belongs in `../regression`.
- Complete in well under 30 seconds and make at least one real assertion.
- Do not depend on other tests, on wallet state, or on network access beyond the app itself.
