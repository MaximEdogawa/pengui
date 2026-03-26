"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect, useCallback } from "react";
import { getAdaptiveConfig, onConnectionChange } from "@/shared/lib/utils/networkQuality";

function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const cfg = getAdaptiveConfig();
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: cfg.staleTimeMs,
          gcTime: cfg.gcTimeMs,
          retry: cfg.retryCount,
          retryDelay: (attempt) => Math.min(cfg.retryDelay * 2 ** attempt, 30_000),
          networkMode: "always",
          refetchOnReconnect: "always",
        },
        mutations: {
          retry: 1,
          networkMode: "always",
        },
      },
    });
  });

  const handleSpeedChange = useCallback(() => {
    const cfg = getAdaptiveConfig();
    queryClient.setDefaultOptions({
      queries: {
        staleTime: cfg.staleTimeMs,
        gcTime: cfg.gcTimeMs,
        retry: cfg.retryCount,
        retryDelay: (attempt) => Math.min(cfg.retryDelay * 2 ** attempt, 30_000),
        networkMode: "always",
        refetchOnReconnect: "always",
      },
      mutations: {
        retry: 1,
        networkMode: "always",
      },
    });
  }, [queryClient]);

  useEffect(() => {
    return onConnectionChange(handleSpeedChange);
  }, [handleSpeedChange]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default ReactQueryProvider;
