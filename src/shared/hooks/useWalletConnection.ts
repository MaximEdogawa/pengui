// Hook to check wallet connection state
// Reads the active wallet provider instead of a transport-specific store.
import { useWalletState } from "@/shared/providers/WalletRuntimeProvider";

export function useWalletConnection() {
  const { isConnected } = useWalletState();

  return { isConnected };
}
