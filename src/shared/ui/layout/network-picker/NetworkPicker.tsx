"use client";

import { useNetwork } from "@/shared/hooks/useNetwork";
import { useThemeClasses } from "@/shared/hooks";
import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { NETWORK_OPTIONS } from "./constants";
import { useNetworkSwitch } from "./useNetworkSwitch";

export default function NetworkPicker() {
  const { network, setNetwork, isMainnet, isNetworkReadOnly } = useNetwork();
  const { isDark } = useThemeClasses();

  const { isSwitching, switchNetwork } = useNetworkSwitch({
    setNetwork,
  });

  const handleNetworkSelect = async (newNetwork: "mainnet" | "testnet") => {
    if (newNetwork === network || isSwitching || isNetworkReadOnly) return;
    await switchNetwork(newNetwork);
  };

  // Sage owns the active network (AC #3): show it as a static badge instead
  // of a dropdown, so there is nothing to click that could look like it
  // switches Sage's network from inside the app.
  if (isNetworkReadOnly) {
    return (
      <div
        className={cn(
          "tap-target relative flex items-center gap-1.5 px-2 py-1 rounded-lg",
          "backdrop-blur-[40px]",
          isDark
            ? "bg-white/10 border border-white/20 text-white shadow-lg shadow-black/20"
            : "bg-white/60 border border-white/70 text-slate-800 shadow-lg shadow-black/10"
        )}
        aria-label={`Network: ${isMainnet ? "Mainnet" : "Testnet"} (set by Sage)`}
        title="The network is controlled by Sage"
      >
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            isMainnet ? NETWORK_OPTIONS[0].color : NETWORK_OPTIONS[1].color
          )}
        />
        <span className="text-[10px] font-medium tracking-tight">
          {isMainnet ? "Mainnet" : "Testnet"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isSwitching}>
        <button
          type="button"
          className={cn(
            "tap-target relative flex items-center gap-1.5 px-2 py-1 rounded-lg",
            "backdrop-blur-[40px] transition-all duration-200",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:scale-[1.02] active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/30",
            isDark
              ? "bg-white/10 border border-white/20 text-white shadow-lg shadow-black/20"
              : "bg-white/60 border border-white/70 text-slate-800 shadow-lg shadow-black/10"
          )}
          aria-label="Select network"
        >
          {isSwitching ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px] font-medium">Switching...</span>
            </>
          ) : (
            <>
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isMainnet ? NETWORK_OPTIONS[0].color : NETWORK_OPTIONS[1].color
                )}
              />
              <span className="text-[10px] font-medium tracking-tight">
                {isMainnet ? "Mainnet" : "Testnet"}
              </span>
              <ChevronDown className="w-2.5 h-2.5 transition-transform duration-200" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className={cn(
          "min-w-[140px] rounded-xl backdrop-blur-xl p-0.5",
          isDark ? "bg-slate-900/95 border-white/25" : "bg-white/95 border-slate-200/90"
        )}
        style={{ zIndex: 10001 }}
      >
        {NETWORK_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => handleNetworkSelect(option.value)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer",
              isDark
                ? network === option.value
                  ? "bg-cyan-500/20 text-white"
                  : "text-slate-300 focus:bg-white/10 focus:text-white"
                : network === option.value
                  ? "bg-cyan-500/20 text-slate-900"
                  : "text-slate-700 focus:bg-white/50 focus:text-slate-900"
            )}
          >
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full", option.color)} />
              <span className="text-[10px] font-medium tracking-tight">{option.label}</span>
            </div>
            {network === option.value && <Check className="w-3 h-3 text-cyan-400" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
