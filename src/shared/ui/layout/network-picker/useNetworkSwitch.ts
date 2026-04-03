import { useState } from "react";
import { logger } from "@/shared/lib/logger";

interface UseNetworkSwitchProps {
  setNetwork: (network: "mainnet" | "testnet") => Promise<boolean>;
}

/**
 * Extract network switching logic to reduce NetworkPicker size
 */
export function useNetworkSwitch({ setNetwork }: UseNetworkSwitchProps) {
  const [isSwitching, setIsSwitching] = useState(false);

  const switchNetwork = async (newNetwork: "mainnet" | "testnet") => {
    setIsSwitching(true);

    try {
      const success = await setNetwork(newNetwork);
      if (!success) {
        logger.error("Network switch failed: setNetwork returned false");
      }
    } catch (error) {
      logger.error("Network switch failed:", error);
    } finally {
      setIsSwitching(false);
    }
  };

  return {
    isSwitching,
    switchNetwork,
  };
}
