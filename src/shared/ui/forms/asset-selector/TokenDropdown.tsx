"use client";

import { useThemeClasses } from "@/shared/hooks";
import { AssetList } from "@/shared/ui";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface Token {
  assetId: string;
  ticker: string;
  symbol?: string;
  name?: string;
}

interface TokenDropdownProps {
  tokens: Token[];
  isOpen: boolean;
  onSelect: (token: Token) => void;
  onClose: () => void;
  searchValue: string;
  useAssetList?: boolean;
}

export default function TokenDropdown({
  tokens,
  isOpen,
  onSelect,
  onClose,
  searchValue,
  useAssetList = false,
}: TokenDropdownProps) {
  const { isDark } = useThemeClasses();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset selected index when tokens change
  useEffect(() => {
    setSelectedIndex(0);
  }, [tokens]);

  // Scroll selected item into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % tokens.length);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + tokens.length) % tokens.length);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (tokens[selectedIndex]) {
          onSelect(tokens[selectedIndex]);
          onClose();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, tokens, selectedIndex, onSelect]);

  if (!isOpen || tokens.length === 0) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "[&>button:last-child]:hidden",
          "max-w-3xl w-full max-h-[60dvh] p-0 rounded-lg shadow-xl overflow-hidden",
          "backdrop-blur-[40px] border transition-all duration-300",
          isDark ? "bg-white/10 border-white/20" : "bg-white/60 border-white/70"
        )}
        style={{ zIndex: 9999 }}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Select token</DialogTitle>

        {/* Label showing search input value */}
        {searchValue && (
          <div
            className={cn(
              "px-3 py-2 border-b",
              isDark ? "border-gray-700 bg-gray-800/50" : "border-gray-200 bg-gray-50"
            )}
          >
            <label
              className={cn("text-xs font-medium", isDark ? "text-gray-300" : "text-gray-700")}
            >
              Search: <span className={isDark ? "text-white" : "text-gray-900"}>{searchValue}</span>
            </label>
          </div>
        )}

        {/* Token List */}
        <div
          className="overflow-y-auto"
          style={{
            // dvh, not vh: vh ignores the on-screen keyboard, so on a phone the list
            // rendered underneath the keyboard raised by this dropdown's own search box.
            maxHeight: searchValue ? "calc(60dvh - 60px)" : "calc(60dvh - 20px)",
          }}
        >
          {useAssetList ? (
            <div className="p-2">
              <AssetList
                label={searchValue ? `Results` : `Tokens`}
                assets={tokens.map((t) => ({ id: t.assetId || "", code: t.ticker }))}
                getTickerSymbol={(assetId: string, code?: string) => code || "XCH"}
                onSelect={(assetId: string) => {
                  const token =
                    tokens.find((t) => (t.assetId || "") === assetId) ||
                    tokens.find((t) => t.ticker === assetId);
                  if (token) {
                    onSelect(token);
                    onClose();
                  }
                }}
                highlightedIndex={selectedIndex}
              />
            </div>
          ) : (
            tokens.map((token, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={token.assetId || "xch"}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => {
                    onSelect(token);
                    onClose();
                  }}
                  className={cn(
                    "px-3 py-2 cursor-pointer text-xs transition-colors border-b last:border-b-0",
                    isSelected
                      ? isDark
                        ? "bg-gray-700/80 text-white border-gray-600"
                        : "bg-gray-200 text-gray-900 border-gray-300"
                      : isDark
                        ? "text-white border-gray-700 hover:bg-gray-700/50 active:bg-gray-600"
                        : "text-gray-900 border-gray-200 hover:bg-gray-100 active:bg-gray-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className={cn(
                            "font-semibold truncate",
                            isDark ? "text-white" : "text-gray-900"
                          )}
                        >
                          {token.ticker}
                        </div>
                        {token.assetId && (
                          <div
                            className={cn(
                              "text-xs font-mono flex-shrink-0",
                              isDark ? "text-gray-400" : "text-gray-500"
                            )}
                          >
                            {token.assetId.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                      {token.name && token.name !== token.ticker && (
                        <div
                          className={cn(
                            "text-xs mt-0.5 truncate",
                            isDark ? "text-gray-400" : "text-gray-600"
                          )}
                        >
                          {token.name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
