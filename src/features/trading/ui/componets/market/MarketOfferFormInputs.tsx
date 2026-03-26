"use client";

import { useThemeClasses } from "@/shared/hooks";

interface MarketOfferFormInputsProps {
  order?: unknown;
  offerString: string;
  setOfferString: (value: string) => void;
  isSubmitting: boolean;
}

export default function MarketOfferFormInputs({
  order,
  offerString,
  setOfferString,
  isSubmitting,
}: MarketOfferFormInputsProps) {
  const { t } = useThemeClasses();

  // Only show offer string input when no order is provided
  if (order) {
    return null;
  }

  return (
    <div>
      <label className={`block text-xs font-medium ${t.text} mb-1.5`}>Offer String</label>
      <textarea
        value={offerString}
        onChange={(e) => setOfferString(e.target.value)}
        placeholder="Paste offer string here..."
        rows={6}
        className={`w-full px-2 py-1.5 border rounded-lg text-xs ${t.input} ${t.border} backdrop-blur-xl font-mono`}
        disabled={isSubmitting}
      />
      <p className={`mt-1 text-xs ${t.textSecondary}`}>
        Paste an offer string to take an offer from the marketplace.
      </p>
    </div>
  );
}
