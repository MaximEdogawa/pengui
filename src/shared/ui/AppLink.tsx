"use client";

import NextLink from "next/link";
import { useMemo, type ComponentProps } from "react";
import { getConnectionSpeed } from "@/shared/lib/utils/networkQuality";

/**
 * Standard in-app navigation link.  Disables prefetching on slow connections
 * (3G / save-data) so the limited bandwidth is used for the active page's
 * data instead of speculative route fetches.
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  const prefetch = useMemo(() => {
    if (props.prefetch !== undefined) return props.prefetch;
    return getConnectionSpeed() !== "slow";
  }, [props.prefetch]);

  return <NextLink {...props} prefetch={prefetch} />;
}
