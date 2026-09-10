/**
 * The swap / add liquidity / remove liquidity UI is gated behind the `swap`
 * feature flag while TibetSwap - the AMM behind it - winds down. The tab must be
 * absent, not merely empty: an entry point that leads nowhere is worse than none.
 */

import { describe, expect, it, afterEach } from "bun:test";
import { render, screen, cleanup } from "@/test-utils";
import OfferTab from "./OfferTab";

const originalRaw = process.env.NEXT_PUBLIC_FEATURE_FLAGS;

function setFlags(raw: string) {
  process.env.NEXT_PUBLIC_FEATURE_FLAGS = raw;
}

afterEach(() => {
  if (originalRaw === undefined) {
    delete process.env.NEXT_PUBLIC_FEATURE_FLAGS;
  } else {
    process.env.NEXT_PUBLIC_FEATURE_FLAGS = originalRaw;
  }
  cleanup();
});

function renderTab() {
  return render(
    <OfferTab activeMode="taker" onModeChange={() => {}} selectedOrder={null} filters={{}} />
  );
}

describe("OfferTab swap gating", () => {
  it("hides the Swap tab when the swap flag is off", () => {
    setFlags("dashboard,offers,trading,wallet");
    renderTab();

    expect(screen.queryByRole("button", { name: /swap/i })).not.toBeInTheDocument();
  });

  it("hides the Swap tab for the default flag set", () => {
    setFlags("");
    renderTab();

    expect(screen.queryByRole("button", { name: /swap/i })).not.toBeInTheDocument();
  });

  it("shows the Swap tab when the swap flag is explicitly enabled", () => {
    setFlags("dashboard,offers,trading,wallet,swap");
    renderTab();

    expect(screen.getByRole("button", { name: /swap/i })).toBeInTheDocument();
  });
});
