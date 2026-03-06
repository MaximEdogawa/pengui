// Public API for wallet feature
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
} from "./hooks/useWalletQueries";
export { useWalletSession } from "./hooks/useWalletSession";
export { useWalletFingerprint } from "./hooks/useWalletFingerprint";
export { useSignClient } from "./hooks/useSignClient";
export { useTransactionForm } from "./hooks/useTransactionForm";
export { useTransactionHistory } from "./hooks/useTransactionHistory";
export { useBalanceLoading } from "./hooks/useBalanceLoading";
export { useWalletAssets, type WalletAssetItem, type WalletAssetType } from "./hooks/useWalletAssets";
export { useAssetFilter, type AssetFilterCategory } from "./hooks/useAssetFilter";
export { useAssetPriceChart } from "./hooks/useAssetPriceChart";

// UI Components
export { default as RecentTransactions } from "./ui/RecentTransactions";
export { default as SendTransactionForm } from "./ui/SendTransactionForm";
export { default as TransactionItem } from "./ui/TransactionItem";
export { default as TransactionStatus } from "./ui/TransactionStatus";
export { default as WalletAddress } from "./ui/WalletAddress";
export { default as WalletBalanceCard } from "./ui/WalletBalanceCard";
export { default as WalletPageHeader } from "./ui/WalletPageHeader";
export { default as AssetPane } from "./ui/AssetPane";
export { default as AssetListPane } from "./ui/AssetListPane";
export { default as WalletFilterBar } from "./ui/WalletFilterBar";
export { default as WalletBalanceCompact } from "./ui/WalletBalanceCompact";
export { default as AssetDetailView } from "./ui/AssetDetailView";
