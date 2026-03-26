/**
 * Patches WebSocket.prototype.bufferedAmount and installs an error handler so
 * that Splash WASM never hits an infinite loop from a dead WebSocket reference.
 *
 * The error "undefined is not an object (evaluating 'getObject(arg0).bufferedAmount')"
 * comes from libp2p-websocket-websys (Splash WASM): when the tab is backgrounded,
 * the browser can invalidate the WebSocket; the WASM still holds a reference but
 * getObject(idx) can return undefined, so the property access throws.
 *
 * - Prototype patch: when the receiver is a WebSocket and the getter throws
 *   (e.g. detached socket), we return 0.
 * - onerror handler: when getObject returns undefined we can't intercept the
 *   property access; we suppress that specific error so it doesn't loop.
 */

/** From wasm-bindgen glue when WebSocket ref is stale (e.g. tab hidden). Message may vary by browser. */
function isBufferedAmountStaleError(message: string): boolean {
  return message.includes("getObject") && message.includes("bufferedAmount");
}

let applied = false;

export function applyWebSocketBufferedAmountPatch(): void {
  if (typeof window === "undefined" || applied) return;

  try {
    const desc = Object.getOwnPropertyDescriptor(WebSocket.prototype, "bufferedAmount");
    if (desc?.get) {
      const originalGet = desc.get;
      Object.defineProperty(WebSocket.prototype, "bufferedAmount", {
        get(this: WebSocket) {
          try {
            if (this == null || typeof this !== "object") return 0;
            return originalGet!.call(this);
          } catch {
            return 0;
          }
        },
        configurable: true,
        enumerable: desc.enumerable,
      });
    }

    const prevOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error): boolean {
      const msg = typeof message === "string" ? message : "";
      if (isBufferedAmountStaleError(msg)) {
        return true;
      }
      if (typeof prevOnError === "function") {
        return prevOnError.call(window, message, source, lineno, colno, error);
      }
      return false;
    };
    applied = true;
  } catch {
    // ignore if patch fails (e.g. frozen prototype)
  }
}
