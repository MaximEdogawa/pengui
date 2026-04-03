/**
 * Parses a search input string into structured search intent.
 *
 * Supported formats:
 * - "buy XCH" / "sell BYC"  → directed mode (detects side)
 * - "XCH/BYC"               → pair mode (first=buy, second=sell)
 * - "XCH BYC"               → pair mode (first=buy, second=sell)
 * - "XCH"                   → plain mode (show both sides)
 */

export interface ParsedSearch {
  mode: "plain" | "directed" | "pair";
  tokens: Array<{ ticker: string; side?: "buy" | "sell" }>;
}

const SIDE_KEYWORDS = new Set(["buy", "sell"]);

export function parseSearchInput(raw: string): ParsedSearch {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { mode: "plain", tokens: [] };
  }

  // Check for slash-separated pair: "XCH/BYC"
  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((p) => p.trim().toUpperCase());
    if (parts.length === 2 && parts[0] && parts[1]) {
      return {
        mode: "pair",
        tokens: [
          { ticker: parts[0], side: "buy" },
          { ticker: parts[1], side: "sell" },
        ],
      };
    }
  }

  const parts = trimmed.split(/\s+/);

  // Check for directed: "buy XCH" or "sell BYC"
  if (parts.length >= 2 && SIDE_KEYWORDS.has(parts[0].toLowerCase())) {
    const side = parts[0].toLowerCase() as "buy" | "sell";
    const ticker = parts.slice(1).join(" ").toUpperCase();
    return {
      mode: "directed",
      tokens: [{ ticker, side }],
    };
  }

  // Check for space-separated pair: "XCH BYC" (exactly 2 tokens, neither is buy/sell)
  if (parts.length === 2 && !SIDE_KEYWORDS.has(parts[0].toLowerCase()) && !SIDE_KEYWORDS.has(parts[1].toLowerCase())) {
    return {
      mode: "pair",
      tokens: [
        { ticker: parts[0].toUpperCase(), side: "buy" },
        { ticker: parts[1].toUpperCase(), side: "sell" },
      ],
    };
  }

  // Default: plain mode (single token search)
  return {
    mode: "plain",
    tokens: [{ ticker: trimmed.toUpperCase() }],
  };
}
