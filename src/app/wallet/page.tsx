'use client'

import {
  useWalletBalance,
  WalletPageHeader,
  WalletBalanceCard,
  WalletAddress,
  SendTransactionForm,
  RecentTransactions,
} from '@/features/wallet'
import { mojosToXch } from '@/shared/lib/utils/chia-units'
import { useMemo, useEffect, useState } from 'react'
import Card from '@/features/wallet/ui/shared/Card'
import SectionHeader from '@/features/wallet/ui/shared/SectionHeader'
import { Send } from 'lucide-react'

export default function WalletPage() {
  const [mounted, setMounted] = useState(false)
  const { data: balance } = useWalletBalance()

  const availableBalance = useMemo(() => {
    if (!balance?.spendable) return 0
    return mojosToXch(balance.spendable)
  }, [balance])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="w-full relative z-10">
      <WalletPageHeader />

      <Card className="mb-2">
        <WalletBalanceCard />
        <div className="mt-3">
          <WalletAddress />
        </div>
      </Card>

      <Card className="mb-2">
        <SectionHeader icon={Send} title="Send Transaction" />
        <SendTransactionForm availableBalance={availableBalance} />
      </Card>

      <RecentTransactions />
    </div>
  )
}
