"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useThemeClasses } from "@/shared/hooks";
import { useNetwork } from "@/shared/hooks/useNetwork";
import { XchIcon } from "@/entities/asset";
import TickerIcon from "@/entities/asset/ui/TickerIcon";
import { AssetPairIcon } from "@/shared/ui/icons/AssetPairIcon";
import type { TibetApiPair } from "../lib/tibetTypes";

const ICON_SIZE = 20;

function PairOptionRow({
  pair,
  isTestnet,
  compact,
}: {
  pair: TibetApiPair;
  isTestnet: boolean;
  compact?: boolean;
}) {
  const iconSize = compact ? 16 : ICON_SIZE;
  return (
    <span className="flex items-center gap-2 min-w-0">
      <AssetPairIcon
        back={<XchIcon size={iconSize} isTestnet={isTestnet} />}
        front={
          <TickerIcon
            assetId={pair.asset_id}
            ticker={pair.asset_short_name || pair.asset_name}
            size={iconSize}
          />
        }
      />
      <span className="truncate">
        XCH / {pair.asset_short_name || pair.asset_name}
      </span>
    </span>
  );
}

interface PairSelectorProps {
  pairs: TibetApiPair[];
  value: TibetApiPair | null;
  onChange: (pair: TibetApiPair | null) => void;
  disabled?: boolean;
  placeholder?: string;
  variant?: "default" | "glass";
  "data-testid"?: string;
}

export function PairSelector({
  pairs,
  value,
  onChange,
  disabled = false,
  placeholder = "Select pair",
  variant = "default",
  "data-testid": dataTestId,
}: PairSelectorProps) {
  const { t } = useThemeClasses();
  const { network } = useNetwork();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isTestnet = network === "testnet";
  const isGlass = variant === "glass";

  const triggerClass = isGlass
    ? `w-full rounded-xl px-2.5 py-1.5 text-xs text-left flex items-center justify-between gap-2 ${t.card} border ${t.border} ${t.text} transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : t.cardHover
      }`
    : `w-full rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 ${t.card} border ${t.border} ${t.text} transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : t.cardHover
      }`;

  const dropdownClass = isGlass
    ? `absolute z-10 mt-1 w-full max-h-52 overflow-auto rounded-xl border ${t.border} ${t.card} shadow-lg py-0.5`
    : `absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-lg border ${t.border} ${t.card} shadow-lg py-1`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full" ref={containerRef} data-testid={dataTestId}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={triggerClass}
      >
        {value ? (
          <PairOptionRow pair={value} isTestnet={isTestnet} compact />
        ) : (
          <span className={t.textSecondary}>{placeholder}</span>
        )}
        <ChevronDown
          size={14}
          className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className={dropdownClass} role="listbox">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={`w-full px-2.5 py-1.5 text-left text-xs ${t.cardHover} ${t.text}`}
            role="option"
          >
            {placeholder}
          </button>
          {pairs.map((p) => (
            <button
              key={p.pair_id}
              type="button"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
              className={`w-full px-2.5 py-1.5 text-left text-xs ${t.cardHover} flex items-center ${
                value?.pair_id === p.pair_id ? t.cardHover : ""
              } ${t.text}`}
              role="option"
            >
              <PairOptionRow pair={p} isTestnet={isTestnet} compact />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
