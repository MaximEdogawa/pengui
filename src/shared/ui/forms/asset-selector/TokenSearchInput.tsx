"use client";

import { useThemeClasses } from "@/shared/hooks";
import { TickerIcon } from "@/entities/asset";
import TokenDropdown, { type Token } from "./TokenDropdown";

interface TokenSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  placeholder: string;
  disabled: boolean;
  filteredTokens: Token[];
  onSelectToken: (token: Token) => void;
  isDropdownOpen: boolean;
  onCloseDropdown: () => void;
  allTokens?: Token[];
  useAssetList?: boolean;
}

export default function TokenSearchInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  disabled,
  filteredTokens,
  onSelectToken,
  isDropdownOpen,
  onCloseDropdown,
  allTokens = [],
  useAssetList = false,
}: TokenSearchInputProps) {
  const { t, isDark } = useThemeClasses();

  const selectedToken = allTokens.find(
    (token) => token.ticker.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div className="relative">
      <div className="relative flex items-center">
        {/* Show icon with input text when token is selected */}
        {selectedToken && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <TickerIcon
              assetId={selectedToken.assetId || undefined}
              ticker={selectedToken.ticker}
              size={18}
            />
          </div>
        )}
            <input
          type="text"
          value={value}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Prevent Enter key from submitting the form or removing the asset
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          placeholder={placeholder}
              className={`w-full h-10 md:h-8 font-medium rounded-lg border ${t.border} ${t.bg} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 ${
                selectedToken ? "pl-10 pr-3 md:pl-8" : "px-3 md:px-2"
              } text-base md:text-sm ${
                isDark
                  ? "text-white placeholder:text-gray-400"
                  : "text-slate-900 placeholder:text-slate-500"
              }`}
          disabled={disabled}
        />
      </div>
      <TokenDropdown
        tokens={filteredTokens}
        isOpen={isDropdownOpen}
        onSelect={onSelectToken}
        onClose={onCloseDropdown}
        searchValue={value}
        useAssetList={useAssetList}
      />
    </div>
  );
}
