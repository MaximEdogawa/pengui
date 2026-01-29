// Public API for wallet feature
// Note: useWalletConnection moved to @/shared/hooks/useWalletConnection
export {
  useWalletBalance,
  useWalletAddress,
  useAssetCoins,
  useSignCoinSpends,
  useSignMessage,
  useSendTransaction,
  useGetBalance,
  useCreateOffer,
  useCancelOffer,
  useTakeOffer,
  useRefreshBalance,
} from "./hooks/useWalletQueries";
export { useWalletSession } from "./hooks/useWalletSession";
export { useWalletFingerprint } from "./hooks/useWalletFingerprint";
export { useWalletConnectEventListeners } from "./hooks/useWalletConnectEventListeners";
export { useSignClient } from "./hooks/useSignClient";
export { useTransactionForm } from "./hooks/useTransactionForm";
export { useTransactionHistory } from "./hooks/useTransactionHistory";
export { useBalanceLoading } from "./hooks/useBalanceLoading";

// UI Components
export { default as RecentTransactions } from "./ui/RecentTransactions";
export { default as SendTransactionForm } from "./ui/SendTransactionForm";
export { default as TransactionItem } from "./ui/TransactionItem";
export { default as TransactionStatus } from "./ui/TransactionStatus";
export { default as WalletAddress } from "./ui/WalletAddress";
export { default as WalletBalanceCard } from "./ui/WalletBalanceCard";
export { default as WalletPageHeader } from "./ui/WalletPageHeader";
