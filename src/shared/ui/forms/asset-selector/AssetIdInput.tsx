"use client";

import { useThemeClasses } from "@/shared/hooks";

interface AssetIdInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export default function AssetIdInput({ value, onChange, placeholder }: AssetIdInputProps) {
  const { t, isDark } = useThemeClasses();

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full h-8 sm:h-10 md:h-8 px-1.5 sm:px-3 md:px-2 text-[11px] sm:text-base md:text-sm font-medium rounded-lg border ${t.border} ${t.bg} transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
        isDark
          ? "text-white placeholder:text-gray-400"
          : "text-slate-900 placeholder:text-slate-500"
      }`}
    />
  );
}
