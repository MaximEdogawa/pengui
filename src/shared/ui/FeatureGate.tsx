"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isFeatureEnabled, type FeatureFlag } from "@/shared/config/featureFlags";

interface FeatureGateProps {
  flag: FeatureFlag;
  children: React.ReactNode;
}

/**
 * Renders children only when the given feature flag is enabled.
 * Redirects to /dashboard when the feature is disabled.
 */
export function FeatureGate({ flag, children }: FeatureGateProps) {
  const router = useRouter();
  const enabled = isFeatureEnabled(flag);

  useEffect(() => {
    if (!enabled) {
      router.replace("/dashboard");
    }
  }, [enabled, router]);

  if (!enabled) return null;

  return <>{children}</>;
}
