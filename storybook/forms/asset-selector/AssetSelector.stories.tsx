import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { AssetSelector } from '@/shared/ui'

const meta = {
  title: 'Shared/AssetSelector',
  component: AssetSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AssetSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    asset: {
      type: 'xch',
      amount: 0,
      assetId: '',
    },
    onUpdate: () => {},
    availableTokens: [
      { assetId: '', ticker: 'XCH', symbol: 'XCH', name: 'Chia' },
      { assetId: 'abc123', ticker: 'BYC03', symbol: 'BYC03', name: 'BYC03 Token' },
    ],
    isLoadingTickers: false,
  },
}

export const WithAmount: Story = {
  args: {
    asset: {
      type: 'xch',
      amount: 1.5,
      assetId: '',
    },
    onUpdate: () => {},
    availableTokens: [
      { assetId: '', ticker: 'XCH', symbol: 'XCH', name: 'Chia' },
      { assetId: 'abc123', ticker: 'BYC03', symbol: 'BYC03', name: 'BYC03 Token' },
    ],
    isLoadingTickers: false,
  },
}
