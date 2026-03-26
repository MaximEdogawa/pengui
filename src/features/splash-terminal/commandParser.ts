import type { TerminalCommand } from "./types";

/**
 * Parse a single line of terminal input into a command.
 */
export function parseTerminalCommand(line: string): TerminalCommand {
  const trimmed = line.trim();
  if (!trimmed) {
    return { type: "unknown", raw: trimmed };
  }

  if (!trimmed.startsWith("/")) {
    return { type: "unknown", raw: trimmed };
  }

  const parts = trimmed.slice(1).trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase() ?? "";
  const args = parts.slice(1);

  switch (cmd) {
    case "filter": {
      const sub = args[0]?.toLowerCase();
      if (sub === "clear") return { type: "filter", sub: "clear" };
      if (sub === "asset") return { type: "filter", sub: "asset", value: args.slice(1).join(" ") };
      if (sub === "price") {
        const { min, max } = args
          .slice(1)
          .reduce<{ min: number | undefined; max: number | undefined }>(
            (acc, a) => {
              if (a?.startsWith(">") && a.length > 1) acc.min = Number(a.slice(1));
              else if (a?.startsWith("<") && a.length > 1) acc.max = Number(a.slice(1));
              return acc;
            },
            { min: undefined, max: undefined }
          );
        return { type: "filter", sub: "price", min, max };
      }
      if (sub === "amount") {
        const minStr = args[1];
        const min = minStr ? Number(minStr) : undefined;
        if (min !== undefined && !Number.isNaN(min)) return { type: "filter", sub: "amount", min };
      }
      return { type: "unknown", raw: trimmed };
    }
    case "list": {
      const limit = args[0] ? Number(args[0]) : undefined;
      return {
        type: "list",
        limit: limit !== undefined && !Number.isNaN(limit) ? limit : undefined,
      };
    }
    case "watch":
      return { type: "watch", offerId: args.join(" ") || "" };
    case "unwatch":
      return { type: "unwatch", offerId: args.join(" ") || "" };
    case "status":
      return { type: "status" };
    case "reconnect":
      return { type: "reconnect" };
    case "stats":
      return { type: "stats" };
    case "export":
      return {
        type: "export",
        format: "csv",
      };
    case "clear":
      return { type: "clear" };
    case "help":
      return { type: "help" };
    default:
      return { type: "unknown", raw: trimmed };
  }
}

export const HELP_TEXT = `Commands:
  /filter asset <pair>   Filter by asset pair (e.g. XCH-USDT)
  /filter price >min <max  Filter by price range
  /filter amount <min>   Filter by minimum amount
  /filter clear          Clear all filters
  /list [n]              Show last n offers (default 20)
  /watch <offer_id>      Watch an offer for updates
  /unwatch <offer_id>    Stop watching
  /status                Connection status
  /reconnect             Force reconnection
  /stats                 Streaming statistics
  /export csv            Export visible offers as CSV
  /clear                 Clear terminal
  /help                  Show this help`;
