import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards on how responsive utilities are written (TASK-013.04).
 *
 * `tailwind.config.ts` sets no custom `screens`, so `sm:` is Tailwind's default **640px**
 * — wider than any phone in portrait. The unprefixed value is therefore the phone value,
 * and a responsive chain should move in one direction as the viewport grows.
 *
 * A chain that rises and then falls back — `h-8 sm:h-10 md:h-8` — expresses no layout
 * change at all. It is the signature of tuning a number until one viewport looked right,
 * and it means at least one breakpoint is wrong. Seven of these existed across the asset
 * selector and the login screen.
 *
 * See pengui-wiki/development/responsive-layout.md.
 */

const BREAKPOINT_ORDER: Record<string, number> = { base: 0, sm: 1, md: 2, lg: 3, xl: 4, "2xl": 5 };

/** Utilities whose values are not points on a single ordered scale. */
const NOT_A_SCALE = new Set([
  "text",
  "font",
  "bg",
  "border",
  "rounded",
  "z",
  "opacity",
  "duration",
  "flex",
  "grid",
  "col",
  "row",
  "translate",
  "delay",
  "ring",
  "shadow",
  "from",
  "to",
  "via",
  "order",
  "basis",
]);

const NAMED_STEPS: Record<string, number> = {
  px: 0.25,
  xs: 1,
  sm: 2,
  base: 3,
  lg: 4,
  xl: 5,
  "2xl": 6,
  "3xl": 7,
  "4xl": 8,
  "5xl": 9,
};

const UTILITY = /^(-?)([a-z]+(?:-[a-z]+)*)-(\[[^\]]+\]|[0-9.]+|px|xs|sm|base|lg|xl|[0-9]xl)$/;
const CLASS_CHUNK = /(?:class(?:Name)?\s*=\s*)(?:\{)?\s*(?:`([^`]*)`|"([^"]*)"|'([^']*)')/gs;

function stepValue(raw: string): number | null {
  if (raw in NAMED_STEPS) return NAMED_STEPS[raw];
  const arbitrary = /^\[([0-9.]+)(px|rem)?\]$/.exec(raw);
  if (arbitrary) return Number(arbitrary[1]) / (arbitrary[2] === "px" ? 16 : 1);
  const numeric = Number(raw);
  return Number.isNaN(numeric) ? null : numeric;
}

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(path);
  }
  return found;
}

function findNonMonotonicChains(): string[] {
  const problems: string[] = [];

  for (const path of sourceFiles("src")) {
    const source = readFileSync(path, "utf8");

    for (const match of source.matchAll(CLASS_CHUNK)) {
      // Template interpolations hide conditional classes; drop them rather than guess.
      const chunk = (match[1] ?? match[2] ?? match[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
      const byProperty = new Map<string, Map<string, string>>();

      for (const token of chunk.split(/\s+/)) {
        const lastColon = token.lastIndexOf(":");
        const breakpoint = lastColon === -1 ? "base" : token.slice(0, lastColon).split(":").pop()!;
        const utility = lastColon === -1 ? token : token.slice(lastColon + 1);
        if (!(breakpoint in BREAKPOINT_ORDER)) continue;

        const parsed = UTILITY.exec(utility);
        if (!parsed) continue;
        const [, , property, value] = parsed;
        if (NOT_A_SCALE.has(property)) continue;

        if (!byProperty.has(property)) byProperty.set(property, new Map());
        byProperty.get(property)!.set(breakpoint, value);
      }

      for (const [property, byBreakpoint] of byProperty) {
        if (byBreakpoint.size < 3) continue;

        const chain = [...byBreakpoint.entries()]
          .sort((a, b) => BREAKPOINT_ORDER[a[0]] - BREAKPOINT_ORDER[b[0]])
          .map(([breakpoint, value]) => ({ breakpoint, value, step: stepValue(value) }));

        if (chain.some((link) => link.step === null)) continue;

        const risesThenFalls = chain.some(
          (link, i) =>
            i > 0 &&
            i < chain.length - 1 &&
            link.step! > chain[i - 1].step! &&
            chain[i + 1].step! < link.step!
        );

        if (risesThenFalls) {
          problems.push(
            `${path} — ${property}: ${chain.map((l) => `${l.breakpoint}:${l.value}`).join(" → ")}`
          );
        }
      }
    }
  }

  return [...new Set(problems)];
}

describe("responsive utility chains", () => {
  it("never rise at one breakpoint and fall back at the next", () => {
    const problems = findNonMonotonicChains();

    expect(
      problems,
      problems.length === 0
        ? ""
        : `A responsive chain that goes up and then back down expresses no layout change, ` +
            `so at least one breakpoint is wrong. Remember sm: is 640px — wider than any ` +
            `phone — so the unprefixed value is the phone value and chains normally ` +
            `descend.\n\n${problems.join("\n")}`
    ).toEqual([]);
  });
});
