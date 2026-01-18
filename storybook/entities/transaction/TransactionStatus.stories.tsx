import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import TransactionStatus from '@/entities/transaction/ui/TransactionStatus'

const meta = {
  title: 'Entities/Transaction/TransactionStatus',
  component: TransactionStatus,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', null],
    },
    message: {
      control: 'text',
    },
  },
} satisfies Meta<typeof TransactionStatus>

export default meta
type Story = StoryObj<typeof meta>

export const Success: Story = {
  args: {
    type: 'success',
    message: 'Transaction confirmed successfully',
  },
}

export const Error: Story = {
  args: {
    type: 'error',
    message: 'Transaction failed. Please try again.',
  },
}

export const LongMessage: Story = {
  args: {
    type: 'success',
    message: 'Your transaction has been successfully processed and confirmed on the blockchain. The funds have been transferred.',
  },
}
