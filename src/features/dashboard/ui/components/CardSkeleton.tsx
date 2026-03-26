"use client";

import type { ThemeClasses } from "@/shared/lib/theme";

interface CardSkeletonProps {
  isDark: boolean;
  t: ThemeClasses;
  lines?: number;
}

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-gradient-to-r from-transparent via-current to-transparent opacity-[0.07] animate-shimmer bg-[length:200%_100%] ${className ?? ""}`}
    />
  );
}

export function CardSkeleton({ isDark, t, lines = 4 }: CardSkeletonProps) {
  return (
    <div
      className={`backdrop-blur-[40px] ${t.card} rounded-2xl p-3 border ${t.border} shadow-lg shadow-black/5 ${
        isDark ? "bg-white/[0.03]" : "bg-white/30"
      }`}
    >
      <ShimmerBar className="h-3 w-24 mb-3" />
      <ShimmerBar className="h-6 w-32 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerBar key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}
