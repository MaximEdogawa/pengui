import FileCheck from "lucide-react/dist/esm/icons/file-check";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Handshake from "lucide-react/dist/esm/icons/handshake";
import Home from "lucide-react/dist/esm/icons/house";
import PiggyBank from "lucide-react/dist/esm/icons/piggy-bank";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Wallet from "lucide-react/dist/esm/icons/wallet";
import { isFeatureEnabled, MENU_ID_TO_FLAG } from "@/shared/config/featureFlags";

const ALL_MENU_ITEMS = [
  { id: "dashboard", icon: Home, label: "Dashboard", path: "/dashboard" },
  { id: "offers", icon: Handshake, label: "Offers", path: "/offers" },
  { id: "trading", icon: TrendingUp, label: "Trading", path: "/trading" },
  { id: "loans", icon: FileText, label: "Loans", path: "/loans" },
  {
    id: "option-contracts",
    icon: FileCheck,
    label: "Option Contracts",
    path: "/option-contracts",
  },
  { id: "piggy-bank", icon: PiggyBank, label: "Piggy Bank", path: "/piggy-bank" },
  { id: "wallet", icon: Wallet, label: "Wallet", path: "/wallet" },
];

/**
 * Returns menu items filtered by feature flags.
 * Items whose feature flag is disabled are excluded from navigation.
 */
export function useMenuItems() {
  return ALL_MENU_ITEMS.filter((item) => {
    const flag = MENU_ID_TO_FLAG[item.id];
    return !flag || isFeatureEnabled(flag);
  });
}
