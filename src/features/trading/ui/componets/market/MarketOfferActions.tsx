"use client";

import { OrderBookOrder } from "@/features/trading/lib/orderBookTypes";
import { Button } from "@/shared/ui";
import { Loader2, ShoppingCart } from "lucide-react";

interface MarketOfferActionsProps {
  mode?: "modal" | "inline";
  onClose?: () => void;
  isFormValid: boolean;
  isSubmitting: boolean;
  orderType: "buy" | "sell" | null;
  order?: OrderBookOrder | null;
}

export default function MarketOfferActions({
  mode,
  onClose,
  isFormValid,
  isSubmitting,
  orderType,
  order,
}: MarketOfferActionsProps) {
  const isTakeable = order?.offerState ? order.offerState === "Open" : true;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {mode === "modal" && onClose && (
        <Button
          type="button"
          onClick={onClose}
          variant="secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      )}
      {isTakeable && (
        <Button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          variant={orderType === "sell" ? "danger" : "success"}
          icon={isSubmitting ? undefined : ShoppingCart}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              Taking...
            </>
          ) : (
            "Take Offer"
          )}
        </Button>
      )}
    </div>
  );
}
