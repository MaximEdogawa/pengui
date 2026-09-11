import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { Window } from "happy-dom";
import { afterEach, mock } from "bun:test";

// WalletRuntimeProvider mounts WalletConnectRuntime on every test render, which
// calls SignClient.init() and would otherwise open a real relay connection on
// every single test. Stub it so unit/integration tests never touch the network.
mock.module("@walletconnect/sign-client", () => {
  class FakeSignClient {
    session = { getAll: () => [] };
    on() {}
    off() {}
    removeListener() {}
    static async init() {
      return new FakeSignClient();
    }
  }
  return { SignClient: FakeSignClient, default: FakeSignClient };
});

// Initialize DOM environment for Bun tests
if (typeof window === "undefined") {
  const windowInstance = new Window();
  // @ts-expect-error - happy-dom Window needs to be assigned to global
  global.window = windowInstance as unknown as Window & typeof globalThis;
  // @ts-expect-error - happy-dom document needs to be assigned to global
  global.document = windowInstance.document;
  // @ts-expect-error - happy-dom navigator needs to be assigned to global
  global.navigator = windowInstance.navigator;
  global.localStorage = windowInstance.localStorage;
  global.sessionStorage = windowInstance.sessionStorage;
  global.getComputedStyle = windowInstance.getComputedStyle.bind(windowInstance);
  global.MutationObserver = windowInstance.MutationObserver as typeof MutationObserver;
  global.NodeFilter = windowInstance.NodeFilter;
  global.HTMLElement = windowInstance.HTMLElement;
  global.Element = windowInstance.Element;
  global.Node = windowInstance.Node;
  global.HTMLInputElement = windowInstance.HTMLInputElement;
  global.HTMLButtonElement = windowInstance.HTMLButtonElement;
  global.HTMLAnchorElement = windowInstance.HTMLAnchorElement;

  // Set up URL environment for Next.js Image component
  // Use Object.defineProperty to properly set location
  Object.defineProperty(window, "location", {
    value: {
      origin: "http://localhost:3000",
      href: "http://localhost:3000",
      protocol: "http:",
      host: "localhost:3000",
      hostname: "localhost",
      port: "3000",
      pathname: "/",
      search: "",
      hash: "",
      assign: () => {},
      replace: () => {},
      reload: () => {},
    },
    writable: true,
    configurable: true,
  });
}

// Mock window.matchMedia for tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as typeof ResizeObserver;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds = [];

  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as typeof IntersectionObserver;

// Clean up after each test to prevent test pollution.
//
// Testing Library only registers its own cleanup when `afterEach` is a global,
// which it is not under bun:test, so every rendered tree would otherwise stay
// mounted for the rest of the run. That matters beyond leaked DOM: Radix
// overlays (Dialog, Select, ...) set `pointer-events: none` on <body> while
// open and restore it on unmount, so a still-mounted modal from an earlier
// file makes every later user-event click throw "element inherits
// pointer-events: none". CI walks the test files in a different order than
// macOS, which is why this only surfaced there.
afterEach(() => {
  cleanup();
  if (typeof document !== "undefined" && document.body) {
    document.body.replaceChildren();
    document.body.removeAttribute("style");
  }
});
