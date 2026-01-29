import {
  FileCheck,
  FileText,
  Handshake,
  Home,
  PiggyBank,
  TrendingUp,
  Wallet,
} from 'lucide-react'

/**
 * Extract menu items configuration to reduce DashboardLayout size
 */
export function useMenuItems() {
  return [
    { id: 'dashboard', icon: Home, label: 'Dashboard', path: '/dashboard' },
    { id: 'offers', icon: Handshake, label: 'Offers', path: '/offers' },
    { id: 'trading', icon: TrendingUp, label: 'Trading', path: '/trading' },
    { id: 'loans', icon: FileText, label: 'Loans', path: '/loans' },
    {
      id: 'option-contracts',
      icon: FileCheck,
      label: 'Option Contracts',
      path: '/option-contracts',
    },
    { id: 'piggy-bank', icon: PiggyBank, label: 'Piggy Bank', path: '/piggy-bank' },
    { id: 'wallet', icon: Wallet, label: 'Wallet', path: '/wallet' },
  ]
}
