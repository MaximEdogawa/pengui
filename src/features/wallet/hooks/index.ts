// Public API for wallet model
// Note: useWalletConnection moved to @/shared/hooks/useWalletConnection
export {
  useWalletBalance,
  useWalletAddress,
  useSignCoinSpends,
  useSignMessage,
  useSendTransaction,
  useCreateOffer,
  useCancelOffer,
  useTakeOffer,
  useRefreshBalance,
} from "./useWalletQueries";
export { useTransactionForm } from "./useTransactionForm";
export { useTransactionHistory } from "./useTransactionHistory";
export { useBalanceLoading } from "./useBalanceLoading";
export { useWalletConnectionHealthCheck } from "./useWalletConnectionHealthCheck";
