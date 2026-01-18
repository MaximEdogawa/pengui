import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SectionHeader } from '@/shared/ui'
import { Wallet, History, Settings as SettingsIcon, TrendingUp } from 'lucide-react'

const meta = {
  title: 'Components/Layout/SectionHeader',
  component: SectionHeader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: false,
    },
    title: {
      control: 'text',
    },
    iconSize: {
      control: 'number',
    },
  },
} satisfies Meta<typeof SectionHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: Wallet,
    title: 'Wallet',
  },
}

export const RecentTransactions: Story = {
  args: {
    icon: History,
    title: 'Recent Transactions',
  },
}

export const Settings: Story = {
  args: {
    icon: SettingsIcon,
    title: 'Settings',
  },
}

export const Analytics: Story = {
  args: {
    icon: TrendingUp,
    title: 'Analytics',
  },
}

export const CustomIconSize: Story = {
  args: {
    icon: Wallet,
    title: 'Custom Icon Size',
    iconSize: 20,
  },
}
