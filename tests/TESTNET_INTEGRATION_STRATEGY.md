# Testnet Integration Testing Strategy

## Overview

This document describes how to set up and automate integration tests that run against the Chia **testnet** using a real funded wallet and WalletConnect session. These tests verify end-to-end flows that cannot be covered by unit or smoke tests.

---

## Test Levels

| Level       | Scope                        | Trigger           | Wallet required      |
| ----------- | ---------------------------- | ----------------- | -------------------- |
| Unit        | Pure functions, hooks        | Every PR          | No                   |
| Smoke       | Page loads, UI render        | Every PR          | No                   |
| Regression  | Known-bug scenarios          | Every PR          | No                   |
| Integration | Full user flows (E2E)        | Main branch merge | Yes (testnet)        |
| Testnet     | Real blockchain transactions | Manual / nightly  | Yes (funded testnet) |

---

## Testnet Wallet Setup

### 1. Create a Dedicated Test Wallet

1. Install [Sage Wallet](https://sagewallet.app) and create a **new mnemonic** used **only** for testing. Never use this mnemonic on mainnet.
2. Switch Sage to **testnet** (Settings → Network → Testnet10).
3. Note the wallet fingerprint and xch-testnet address (`txch1…`).

### 2. Fund the Test Wallet

Get testnet XCH from the Chia testnet faucet:

- https://testnet.chia.net/faucet (request 1 TXCH)
- Or ask in the Chia Discord `#testnet` channel.

Minimum recommended balance: **2 TXCH** (covers test transactions + fees).

### 3. Store Credentials Securely

Store the test wallet seed phrase and WalletConnect pairing URI as **GitHub Actions secrets**:

```
TESTNET_WALLET_MNEMONIC=word1 word2 ... word24
TESTNET_WALLET_ADDRESS=txch1...
TESTNET_WALLETCONNECT_URI=wc:...@2?relay-protocol=irn&...
```

These secrets are injected as environment variables during the CI testnet job.

---

## Automation Strategy

### Option A: Headless Sage Wallet (Recommended)

Sage Wallet is an Electron app. For CI automation, use a **headless Electron test harness**:

1. Run Sage in headless mode inside a Docker container with `xvfb-run`.
2. Use Playwright to drive the Sage UI to approve WalletConnect sessions and sign transactions.
3. The pengui Next.js app runs alongside as the dApp under test.

**Architecture:**

```
GitHub Actions (ubuntu-latest)
  ├── Docker: Sage Wallet (xvfb + Electron)
  │     └── Pre-funded testnet wallet loaded from seed
  └── bun next start (pengui app)
        └── Playwright tests drive the UI
              ├── Navigate to /wallet
              ├── Click "Connect with Sage Wallet"
              ├── Approve in Sage (Playwright drives Sage UI)
              └── Assert balance / perform transaction
```

### Option B: Mock WalletConnect Responses (Simpler, less realistic)

For flows where you only need to verify the dApp side:

1. Intercept WalletConnect RPC calls with a test relay server.
2. Return pre-signed responses from a fixture file.
3. Useful for verifying UI state machines without a real wallet.

This does **not** verify on-chain state but is simpler to set up.

### Option C: Manual Testnet Run with Recording

1. A developer manually runs the full flow on testnet.
2. Playwright records the session to a `.har` file.
3. CI replays the HAR against the app to verify the UI behavior.

Good for one-off regression checks on complex flows.

---

## Testnet Test Scenarios

### Priority 1 — Core Flows

| #     | Scenario              | Steps                                                         | Expected                       |
| ----- | --------------------- | ------------------------------------------------------------- | ------------------------------ |
| T-001 | Connect wallet        | Open pengui → click Connect → approve in Sage                 | Dashboard shows balance        |
| T-002 | View XCH balance      | After connect                                                 | Balance matches chain          |
| T-003 | Send TXCH             | Enter recipient + 0.001 TXCH + fee → submit → approve in Sage | Transaction appears in history |
| T-004 | Create offer          | Offer 0.01 TXCH for SBX → submit                              | Offer visible in "My Offers"   |
| T-005 | Cancel offer          | Select open offer → cancel                                    | Offer status → Cancelled       |
| T-006 | Upload offer to Dexie | Create offer → upload                                         | Offer appears in Dexie testnet |

### Priority 2 — Edge Cases

| #     | Scenario                                                       |
| ----- | -------------------------------------------------------------- |
| T-007 | Insufficient balance → correct error message                   |
| T-008 | Invalid recipient address → validation error shown             |
| T-009 | Session disconnect mid-flow → reconnect prompt                 |
| T-010 | Network switch (mainnet↔testnet) → UI reflects correct network |

---

## CI/CD Pipeline for Testnet Tests

Add a separate workflow `.github/workflows/testnet.yml`:

```yaml
name: Testnet Integration Tests

on:
  schedule:
    - cron: "0 2 * * *" # Nightly at 02:00 UTC
  workflow_dispatch: # Manual trigger

jobs:
  testnet:
    name: Testnet Integration
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: testnet # Requires environment approval in GitHub

    steps:
      - uses: actions/checkout@v5

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.2.23

      - run: bun install
      - run: bunx playwright install --with-deps chromium

      # Start Sage Wallet headless (requires Docker setup)
      - name: Start headless Sage Wallet
        run: |
          docker run -d --name sage \
            -e MNEMONIC="${{ secrets.TESTNET_WALLET_MNEMONIC }}" \
            -p 1646:1646 \
            ghcr.io/your-org/sage-headless:latest

      - name: Build and start pengui
        run: |
          bun run build
          bun run start &
          npx wait-on http://localhost:3000

      - name: Run testnet integration tests
        run: bunx playwright test tests/e2e/testnet --project=chromium
        env:
          CI: true
          TESTNET_WALLET_ADDRESS: ${{ secrets.TESTNET_WALLET_ADDRESS }}
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: testnet-report
          path: playwright-report/
          retention-days: 30
```

---

## Test File Structure for Testnet Tests

```
tests/e2e/testnet/
├── fixtures/
│   └── testnet.ts          # Playwright fixture with pre-connected wallet state
├── wallet-connect.spec.ts  # T-001 to T-002
├── transactions.spec.ts    # T-003
├── offers.spec.ts          # T-004 to T-006
└── edge-cases.spec.ts      # T-007 to T-010
```

### Example Testnet Fixture

```typescript
// tests/e2e/testnet/fixtures/testnet.ts
import { test as base } from "@playwright/test";

export const test = base.extend({
  connectedPage: async ({ page }, use) => {
    // Navigate and trigger wallet connect
    await page.goto("/login");
    await page.getByText("Connect with Sage Wallet").click();

    // Wait for QR code to appear then approve via Sage automation
    await page.waitForSelector('[data-testid="qr-code"]');

    // Sage approval would be driven here via IPC or UI automation
    // For now, use a pre-configured WalletConnect session
    await page.waitForURL(/dashboard/);
    await use(page);
  },
});
```

---

## Cost & Risk Management

- Test wallet should hold **minimum funds** needed for tests (2–5 TXCH).
- Use a **dedicated test address** — never the developer's personal wallet.
- Set up **balance monitoring**: alert if balance drops below 0.5 TXCH.
- Transactions on testnet are free (fees paid from testnet TXCH which has no real value).
- Never commit seeds/mnemonics to the repository — always use GitHub Secrets.

---

## Getting Started Checklist

- [ ] Create dedicated testnet wallet with Sage
- [ ] Fund wallet from Chia testnet faucet
- [ ] Add `TESTNET_WALLET_MNEMONIC` and `TESTNET_WALLET_ADDRESS` to GitHub Secrets
- [ ] Set up `testnet` GitHub environment with required reviewers
- [ ] Create `tests/e2e/testnet/` directory with first test scenario (T-001)
- [ ] Build or source a headless Sage Docker image for CI
- [ ] Add `.github/workflows/testnet.yml` workflow
- [ ] Document runbook for manually topping up testnet balance
