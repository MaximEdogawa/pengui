"use client";

import "xterm/css/xterm.css";
import { useEffect, useRef, useState } from "react";
import type { DexieOffer } from "@/entities/offer";
import { useDexieSearch } from "@/features/offers/hooks/useDexieSearch";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { getDexieSplashRelayUrl } from "@/shared/lib/utils/networkUtils";
import { parseTerminalCommand, HELP_TEXT } from "./commandParser";
import { formatOfferLine } from "./formatOfferLine";
import type { TerminalFilterParams } from "./types";
import { useTerminalOffersSync } from "./useTerminalOffers";
import { useSplashWasm } from "./useSplashWasm";

const SCROLLBACK = 1000;
const PROMPT_PREFIX = "\r\n";
const BACKSPACE = "\u007F";

const TERMINAL_THEME_DARK = {
  background: "#0d1117",
  foreground: "#e6edf3",
  cursor: "#58a6ff",
  black: "#0d1117",
  red: "#f85149",
  green: "#3fb950",
  yellow: "#d29922",
  blue: "#58a6ff",
  magenta: "#bc8cff",
  cyan: "#39c5cf",
  white: "#e6edf3",
};

const TERMINAL_THEME_LIGHT = {
  background: "#f6f8fa",
  foreground: "#1f2328",
  cursor: "#0969da",
  black: "#1f2328",
  red: "#cf222e",
  green: "#1a7f37",
  yellow: "#9a6700",
  blue: "#0969da",
  magenta: "#8250df",
  cyan: "#1b7c83",
  white: "#656d76",
};

function buildPrompt(status: string, filterParams: TerminalFilterParams): string {
  const parts: string[] = [];
  if (status === "connected") parts.push("Connected");
  else if (status === "connecting") parts.push("Connecting...");
  else if (status === "error" || status === "disconnected")
    parts.push(status);
  if (filterParams.assetPair) parts.push(filterParams.assetPair);
  if (filterParams.priceMin != null)
    parts.push(`price>${filterParams.priceMin}`);
  if (filterParams.priceMax != null)
    parts.push(`price<${filterParams.priceMax}`);
  if (filterParams.amountMin != null)
    parts.push(`amount>${filterParams.amountMin}`);
  const bracket = parts.length ? `[${parts.join(" | ")}]` : "";
  return `${bracket} > `;
}

export default function SplashTerminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<{
    write: (s: string) => void;
    writeln: (s: string) => void;
    clear: () => void;
    dispose: () => void;
    focus: () => void;
  } | null>(null);
  const [filterParams, setFilterParams] = useState<TerminalFilterParams>({});
  const [mounted, setMounted] = useState(false);

  const { isDark } = useThemeClasses();
  const { network } = useNetwork();
  const relayUrl = getDexieSplashRelayUrl(network);
  const { searchOffersMutation } = useDexieSearch();
  const { setCachedOffers, appendCachedOffers } =
    useTerminalOffersSync(filterParams);
  const wasm = useSplashWasm();
  const statusRef = useRef(wasm.status);
  const filterParamsRef = useRef(filterParams);
  statusRef.current = wasm.status;
  filterParamsRef.current = filterParams;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    let fitAddon: { fit: () => void; dispose: () => void } | null = null;
    const init = async () => {
      const { Terminal } = await import("xterm");
      const { FitAddon } = await import("xterm-addon-fit");
      const { WebLinksAddon } = await import("xterm-addon-web-links");

      const term = new Terminal({
        cursorBlink: true,
        scrollback: SCROLLBACK,
        theme: isDark ? TERMINAL_THEME_DARK : TERMINAL_THEME_LIGHT,
        fontFamily: "ui-monospace, monospace",
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      fitAddon = fit;
      term.loadAddon(new WebLinksAddon());

      term.open(containerRef.current!);
      fit.fit();

      const writeln = (s: string) => term.writeln(s);
      const writePromptLocal = (statusOverride?: string) =>
        term.write(
          PROMPT_PREFIX +
            buildPrompt(
              statusOverride ?? statusRef.current,
              filterParamsRef.current,
            ),
        );

      termRef.current = {
        write: (s) => term.write(s),
        writeln,
        clear: () => term.clear(),
        dispose: () => term.dispose(),
        focus: () => term.focus(),
      };
      wasm.onOffers((offers: DexieOffer[]) => {
        appendCachedOffers(offers);
        offers.forEach((o) => writeln(formatOfferLine(o)));
      });

      try {
        const result = await searchOffersMutation.mutateAsync({
          page_size: 50,
          status: 1,
        });
        const offers = (result?.data ?? []) as DexieOffer[];
        if (Array.isArray(offers) && offers.length > 0) {
          setCachedOffers(offers);
          offers.forEach((o) => writeln(formatOfferLine(o)));
        }
      } catch {
        // Silent fallback; stream will show live offers when relay connects
      }

      if (!relayUrl) {
        writeln("Live stream unavailable (no relay). Run `bun run relay` in dev.");
        writePromptLocal("disconnected");
      } else {
        wasm
          .initAndConnect(relayUrl, network)
          .then(() => {
            writeln("Live stream connected. New offers appear below.");
            writePromptLocal("connected");
          })
          .catch(() => {
            writeln("Live stream unavailable. Showing REST offers only.");
            writePromptLocal("disconnected");
          });
      }

      let currentLine = "";
      term.onData((data) => {
        if (data === "\r" || data === "\n") {
          const line = currentLine.trim();
          currentLine = "";

          if (line.startsWith("/")) {
            const cmd = parseTerminalCommand(line);
            switch (cmd.type) {
              case "filter":
                if (cmd.sub === "clear") {
                  setFilterParams({});
                  wasm.clearFilters();
                  writeln("Filters cleared.");
                } else if (cmd.sub === "asset") {
                  setFilterParams((p) => ({ ...p, assetPair: cmd.value || null }));
                  wasm.setFilterAsset(cmd.value ?? "");
                  writeln(`Filter asset: ${cmd.value || "(any)"}`);
                } else if (cmd.sub === "price") {
                  setFilterParams((p) => ({
                    ...p,
                    priceMin: cmd.min ?? null,
                    priceMax: cmd.max ?? null,
                  }));
                  wasm.setFilterPrice(cmd.min ?? 0, cmd.max ?? 0);
                  writeln(
                    `Filter price: >${cmd.min ?? ""} <${cmd.max ?? ""}`,
                  );
                } else if (cmd.sub === "amount") {
                  setFilterParams((p) => ({
                    ...p,
                    amountMin: cmd.min ?? null,
                  }));
                  wasm.setFilterAmount(cmd.min ?? 0);
                  writeln(`Filter amount: >${cmd.min ?? ""}`);
                }
                break;
              case "list": {
                const limit = cmd.limit ?? 20;
                const list = wasm.getOffers(0, limit);
                list.forEach((o) => writeln(formatOfferLine(o)));
                writeln(`Showing ${list.length} offers.`);
                break;
              }
              case "status":
                writeln(`Status: ${wasm.status}`);
                break;
              case "reconnect":
                wasm.disconnect();
                wasm.initAndConnect(relayUrl, network).catch(() => {});
                writeln("Reconnecting...");
                break;
              case "stats": {
                const s = wasm.getStats();
                writeln(
                  `Received: ${s.received} | Filtered: ${s.filtered} | Buffer: ${s.bufferLen}`,
                );
                break;
              }
              case "export":
                if (cmd.format === "csv") {
                  const list = wasm.getOffers(0, 10_000);
                  const header = "id,price,offered,requested";
                  const rows = list.map(
                    (o) =>
                      `${o.id},${o.price},"${(o.offered ?? [])
                        .map((a) => `${a.code}:${a.amount}`)
                        .join(" ")}","${(o.requested ?? [])
                        .map((a) => `${a.code}:${a.amount}`)
                        .join(" ")}"`,
                  );
                  const csv = [header, ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "offers.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                  writeln(`Exported ${list.length} offers to offers.csv`);
                }
                break;
              case "clear":
                term.clear();
                break;
              case "help":
                HELP_TEXT.split("\n").forEach(writeln);
                break;
              default:
                writeln("Unknown command. Type /help");
            }
          }
          writePromptLocal();
        } else if (data === BACKSPACE) {
          if (currentLine.length) {
            currentLine = currentLine.slice(0, -1);
            term.write("\b \b");
          }
        } else {
          currentLine += data;
          term.write(data);
        }
      });

      writePromptLocal();
    };

    init();

    const resizeObserver = new ResizeObserver(() => {
      fitAddon?.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      wasm.disconnect();
      termRef.current?.dispose();
      termRef.current = null;
    };
    // Intentionally run only on mount and theme: re-running on relayUrl/wasm would re-create the terminal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isDark]);

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg bg-black/5 dark:bg-black/20">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading terminal...
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col rounded-lg border border-gray-200 dark:border-gray-700"
      data-testid="splash-terminal"
    >
      <div
        ref={containerRef}
        className="h-full w-full min-h-[200px] overflow-hidden p-2"
        style={{ height: "100%" }}
      />
    </div>
  );
}
