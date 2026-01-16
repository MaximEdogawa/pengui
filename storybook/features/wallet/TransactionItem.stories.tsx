import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import TransactionItem from '@/features/wallet/ui/TransactionItem'
import type { StoredTransaction } from '@/shared/lib/walletConnect/utils/transactionStorage'

const meta = {
  title: 'Features/Wallet/TransactionItem',
  component: TransactionItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    transaction: {
      control: false,
    },
  },
} satisfies Meta<typeof TransactionItem>

export default meta
type Story = StoryObj<typeof meta>

const mockSendTransaction: StoredTransaction = {
  id: '1',
  type: 'send',
  amount: 1000000000000, // 1 XCH in mojos
  recipientAddress: 'xch1test123456789',
  timestamp: Date.now() - 3600000, // 1 hour ago
  status: 'confirmed',
  txId: '0x1234567890abcdef',
}

const mockReceiveTransaction: StoredTransaction = {
  id: '2',
  type: 'receive',
  amount: 500000000000, // 0.5 XCH in mojos
  senderAddress: 'xch1sender123456789',
  timestamp: Date.now() - 7200000, // 2 hours ago
  status: 'confirmed',
  txId: '0xabcdef1234567890',
}

const mockPendingTransaction: StoredTransaction = {
  id: '3',
  type: 'send',
  amount: 200000000000, // 0.2 XCH in mojos
  recipientAddress: 'xch1pending123456',
  timestamp: Date.now() - 60000, // 1 minute ago
  status: 'pending',
  txId: '0xpending123456789',
}

export const SendTransaction: Story = {
  args: {
    transaction: mockSendTransaction,
  },
}

export const ReceiveTransaction: Story = {
  args: {
    transaction: mockReceiveTransaction,
  },
}

export const PendingTransaction: Story = {
  args: {
    transaction: mockPendingTransaction,
  },
}
