"use client";

import Image from "next/image";

/**
 * TibetBadge — a tiny TibetSwap protocol badge using the official logo.
 * Intended to be used as an absolute-positioned overlay on asset pair icons.
 */
export function TibetBadge({ size = 14 }: { size?: number }) {
  return (
    <span
      className="flex items-center justify-center rounded-full bg-[#dde6ef] ring-[1.5px] ring-white dark:ring-gray-900 overflow-hidden"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/assets/tibetswap.png"
        alt="TibetSwap"
        width={size}
        height={size}
        className="object-contain"
      />
    </span>
  );
}
