"use client";

import { logger } from "@/shared/lib/logger";
import { useEffect } from "react";
import toast from "react-hot-toast";
import type SignClient from "@walletconnect/sign-client";

// Use a WeakMap to track SignClient instances that have listeners registered
// This persists across page refreshes better than a regular Map
const listenerRegistry = new WeakMap<SignClient, Set<string>>();

type EventHandlers = {
  session_delete: (args: unknown) => void;
  session_expire: (args: unknown) => void;
  session_request: (args: unknown) => void;
  session_proposal: (args: unknown) => void;
  session_update: (args: unknown) => void;
  session_ping: (args: unknown) => void;
};

/**
 * Register WalletConnect event listeners immediately (synchronous)
 * This function can be called directly to register listeners without waiting for React effects
 * Used to prevent race conditions where WalletConnect emits events before useEffect runs
 */
export function registerWalletConnectListeners(
  signClient: SignClient | undefined,
): void {
  if (!signClient) {
    return;
  }

  const registeredEvents = listenerRegistry.get(signClient) || new Set();

  const eventNames: Array<keyof EventHandlers> = [
    "session_delete",
    "session_expire",
    "session_request",
    "session_proposal",
    "session_update",
    "session_ping",
  ];

  // Check if listeners are already registered
  const needsRegistration =
    registeredEvents.size === 0 ||
    !eventNames.every((eventName) => registeredEvents.has(eventName));

  if (!needsRegistration) {
    return;
  }

  // Notify only; do NOT auto-clear state — user must click Disconnect to go to login
  const onSessionEnd = () => {
    toast.error(
      "Wallet session ended. Use Disconnect in the wallet menu to reconnect.",
    );
    logger.info(
      "Wallet session ended; user can disconnect from wallet menu to reconnect",
    );
  };

  // Create event handlers
  const eventHandlers: EventHandlers = {
    session_delete: onSessionEnd,
    session_expire: onSessionEnd,
    session_request: (args: unknown) => {
      const event = args as { topic: string; id: number };
      void (async () => {
        try {
          await signClient.respond({
            topic: event.topic,
            response: {
              id: event.id,
              jsonrpc: "2.0",
              result: { acknowledged: true },
            },
          });
        } catch {
          // Silently handle response errors
        }
      })();
    },
    session_proposal: () => {
      // Session proposal received
    },
    session_update: () => {
      // Session updated
    },
    session_ping: (args: unknown) => {
      const event = args as { topic: string; id?: number };
      const pingId = event.id;
      if (pingId === undefined) return;
      void (async () => {
        try {
          await signClient.respond({
            topic: event.topic,
            response: {
              id: pingId,
              jsonrpc: "2.0",
              result: { acknowledged: true },
            },
          });
        } catch (error) {
          // Suppress "No matching key" errors - these are non-critical
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("No matching key")) {
            if (process.env.NODE_ENV === "development") {
              logger.debug("Session ping error:", error);
            }
          }
        }
      })();
    },
  };

  // Register all event handlers
  Object.entries(eventHandlers).forEach(([eventName, handler]) => {
    signClient.on(eventName as keyof EventHandlers, handler);
    registeredEvents.add(eventName);
  });

  listenerRegistry.set(signClient, registeredEvents);
}

/**
 * Hook to manage WalletConnect event listeners
 * Registers event listeners when SignClient is available
 * Re-registers listeners after page refresh to handle session pings
 *
 * NOTE: This hook now primarily serves as a backup registration mechanism.
 * The main registration happens synchronously in useSignClient to prevent race conditions.
 */
export function useWalletConnectEventListeners(
  signClient: SignClient | undefined,
) {
  useEffect(() => {
    if (!signClient) {
      return;
    }

    registerWalletConnectListeners(signClient);

    // Cleanup function
    // NOTE: We intentionally do NOT remove listeners here because:
    // 1. Listeners are shared across all components using the SignClient
    // 2. Removing listeners during component unmount can cause "no listeners" errors
    //    when WalletConnect emits session_ping during active wallet operations
    // 3. Listeners should persist for the lifetime of the SignClient instance
    // The listeners will be cleaned up when the SignClient is destroyed/recreated
    return () => {
      // Keep listeners active - they're shared across components
    };
  }, [signClient]);
}
