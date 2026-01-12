'use client'

import { useTransactionHistory } from '../model/useTransactionHistory'
import { History } from 'lucide-react'
import Card from './shared/Card'
import SectionHeader from './shared/SectionHeader'
import EmptyState from './shared/EmptyState'
import TransactionItem from './TransactionItem'

export default function RecentTransactions() {
  const transactions = useTransactionHistory()

  return (
    <Card>
      <SectionHeader icon={History} title="Recent Transactions" />
      {transactions.length === 0 ? (
        <EmptyState
          icon={History}
          message="No transactions yet. Transactions sent from this wallet will appear here."
        />
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </div>
      )}
    </Card>
  )
}
