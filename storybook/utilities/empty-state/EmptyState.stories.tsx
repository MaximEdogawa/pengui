import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyState } from '@/shared/ui'
import { Inbox, Package, Search, AlertCircle } from 'lucide-react'

const meta = {
  title: 'Components/Utilities/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: false,
    },
    message: {
      control: 'text',
    },
    iconSize: {
      control: 'number',
    },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: Inbox,
    message: 'No items found',
  },
}

export const NoTransactions: Story = {
  args: {
    icon: Package,
    message: 'No transactions yet. Transactions sent from this wallet will appear here.',
  },
}

export const NoResults: Story = {
  args: {
    icon: Search,
    message: 'No results found. Try adjusting your search criteria.',
  },
}

export const Error: Story = {
  args: {
    icon: AlertCircle,
    message: 'Something went wrong. Please try again later.',
  },
}

export const CustomIconSize: Story = {
  args: {
    icon: Inbox,
    message: 'Empty state with larger icon',
    iconSize: 48,
  },
}
