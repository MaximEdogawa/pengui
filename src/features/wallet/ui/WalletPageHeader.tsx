'use client'

import { useThemeClasses } from '@/shared/hooks'
import Card from './shared/Card'
import { Wallet } from 'lucide-react'

export default function WalletPageHeader() {
  const { isDark, t } = useThemeClasses()

  return (
    <Card className="mb-2">
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-xl ${isDark ? 'bg-cyan-500/10' : 'bg-cyan-600/15'} backdrop-blur-sm`}
        >
          <Wallet
            className={`${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
            size={18}
            strokeWidth={2}
          />
        </div>
        <div>
          <h1 className={`text-xl lg:text-2xl font-semibold ${t.text} mb-0.5`}>Wallet</h1>
          <p className={`${t.textSecondary} text-xs font-medium`}>
            Manage your wallet balance and transactions
          </p>
        </div>
      </div>
    </Card>
  )
}
