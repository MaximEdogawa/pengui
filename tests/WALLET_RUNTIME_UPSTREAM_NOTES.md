# Wallet Runtime Upstream Notes

This document consolidates the upstream context needed to build the Pengui test wallet runtime.

It is a bridge between:

- [`WALLET_RUNTIME_IMPLEMENTATION_SPEC.md`](/Users/leo-private/Projects/chia/pengui/tests/WALLET_RUNTIME_IMPLEMENTATION_SPEC.md)
- the upstream `chia-wallet-sdk`, `sage`, and `rue` repositories

## Goal

Make it easier for future agents to answer:

- what should be built in Pengui
- what should be reused from upstream
- what is needed only later for real signing

## Executive Summary

Yes, there is enough information to start building the testing wallet runtime.

There is enough information for:

- runtime architecture
- process model
- WalletConnect session handling
- the initial fixture-backed method surface
- Playwright integration

There is not yet enough information in these notes alone for:

- production-grade real signing implementation
- full offer lifecycle signing semantics
- exact crate/module selection inside `chia-wallet-sdk` without source-level exploration

That deeper work will require code-level inspection of the upstream Rust crates.

## Upstream Repositories

### 1. `chia-wallet-sdk`

Repository:

- https://github.com/xch-dev/chia-wallet-sdk

What the upstream README says:

- it is a high-performance Rust SDK for building Chia wallet applications
- it is not a prebuilt wallet
- Sage Wallet is built using the Wallet SDK and provides an RPC interface

Source:

- [`chia-wallet-sdk` README on GitHub](https://github.com/xch-dev/chia-wallet-sdk)

Relevant takeaway:

- this is the correct foundation for the minimal test wallet runtime
- we should not try to build the runtime on top of Sage first
- the runtime should be a thin wallet application using the SDK, not a copy of Sage

### 2. `sage`

Repository:

- https://github.com/xch-dev/sage

What the upstream README says:

- Sage is a high-performance light wallet
- it supports WalletConnect
- it supports offers, NFTs, and CATs
- it is built on `chia_rs`, `clvm_rs`, and the Chia Wallet SDK
- the backend is Rust
- the frontend is React
- the backend/frontend communicate over IPC
- wallet driver code is written using the Chia Wallet SDK

Sources:

- [`sage` README on GitHub](https://github.com/xch-dev/sage)

Relevant takeaway:

- Sage is the proof that the Wallet SDK is sufficient to build a wallet runtime
- Sage is useful as a reference implementation for wallet-driver behavior
- Pengui should borrow architecture ideas from Sage, but not depend on Sage as the default test runtime

### 3. `rue`

Repository:

- https://github.com/xch-dev/rue

What the upstream README says:

- Rue is a typed Chia language compiled to CLVM bytecode
- it is intended for writing smart coin puzzles

Source:

- [`rue` README on GitHub](https://github.com/xch-dev/rue)

Relevant takeaway:

- Rue is not required for v1 of the test wallet runtime
- Rue becomes relevant later if Pengui needs custom puzzle generation, offer tooling, or signing flows that depend on custom CLVM logic
- for the first runtime, Rue should be treated as future-facing infrastructure, not a dependency we must adopt immediately

## Practical Interpretation for Pengui

## What We Should Build Ourselves

Inside Pengui, we should build:

- the wallet runtime process wrapper
- the CLI and JSON-line control protocol
- the Playwright fixture integration
- the fixture profiles used for deterministic tests
- the method handlers that translate WalletConnect requests into fixture-backed or SDK-backed responses

## What We Should Reuse Conceptually from Sage

Sage should inform:

- how wallet driver responsibilities are split
- what methods are realistically needed
- how a Wallet SDK based wallet can expose wallet behavior cleanly

Sage should not be the first implementation dependency for the minimal runtime.

Reason:

- Sage is a full wallet product
- it adds UI, IPC, app structure, storage, and product complexity that are not needed for the test runtime

## What We Should Reuse from `chia-wallet-sdk`

The test wallet runtime should rely on `chia-wallet-sdk` for:

- wallet primitives
- address and coin logic
- offer and transaction logic when signing mode arrives
- wallet-driver implementation patterns

Inference from upstream docs:

- since Sage uses the Wallet SDK for its wallet driver, Pengui should expect the SDK to be the correct layer for wallet functionality while Sage remains a consumer of that SDK

## Runtime Design Implications

### V1

Use `chia-wallet-sdk` only as far as needed to support:

- identity
- chain selection
- balance queries
- WalletConnect request/response wiring

Keep transaction and offer behavior fixture-backed where possible.

This reduces scope and gives fast value.

### V2

Start moving method handlers from fixture-backed responses toward SDK-backed logic for:

- `chia_send`
- `chia_createOffer`
- `chia_cancelOffer`

### V3

Add real signing mode and testnet behavior.

Only at this stage should deeper Sage-driver parity matter.

## Proposed Dependency Strategy

### Runtime Core

- `chia-wallet-sdk`
- WalletConnect client library compatible with the Chia method namespace

### Optional Reference Material

- Sage wallet-driver crates and patterns

### Not Required in V1

- Rue
- Sage frontend
- Sage desktop shell

## Method Prioritization

The upstream information supports this priority order.

### First wave

- `chip0002_connect`
- `chip0002_chainId`
- `chia_getAddress`
- `chip0002_getAssetBalance`

Why:

- enough to establish wallet identity
- enough to prove authenticated dashboard and wallet flows

### Second wave

- `chia_send`
- `chia_createOffer`
- `chia_cancelOffer`
- `chia_takeOffer`

Why:

- needed for high-value app workflows
- can still start in fixture mode

### Later wave

- signing helpers
- spend-bundle handling
- richer NFT and CAT operations

## Pengui-Specific Recommendation

Build the minimal runtime as a separate wallet application with a narrow purpose:

- be controllable from tests
- be deterministic
- be able to grow into signing mode later

Do not make the first version depend on:

- Sage app startup
- Sage UI automation
- Sage IPC

Use Sage later as:

- a behavior reference
- a real-wallet verification target

## Known Unknowns

These still need source-level exploration in upstream code:

- which exact `chia-wallet-sdk` crates and modules should back each required method
- whether the SDK already exposes the right primitives for WalletConnect-oriented request handlers
- how much of Sage’s wallet driver can be mirrored without bringing in product-level concerns
- whether signing mode needs direct full-node submission logic in Pengui’s runtime or a thinner wrapper around upstream functionality

## Recommended Next Research Step

When implementation begins, inspect upstream in this order:

1. `chia-wallet-sdk` examples and bindings
2. Sage wallet-driver crates and backend command handlers
3. only then inspect Rue if custom CLVM work becomes necessary

## Working Decision

Until proven otherwise, implementation should proceed with this assumption:

- `chia-wallet-sdk` is sufficient to build the minimal test runtime
- Sage is the reference wallet product built on top of that SDK
- Rue is optional for later advanced signing or puzzle work, not for the initial runtime

## Sources

- `chia-wallet-sdk` GitHub repository: https://github.com/xch-dev/chia-wallet-sdk
- `sage` GitHub repository: https://github.com/xch-dev/sage
- `rue` GitHub repository: https://github.com/xch-dev/rue
