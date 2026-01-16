import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { TokenDropdown } from '@/shared/ui'

const meta = {
  title: 'Components/Forms/TokenDropdown',
  component: TokenDropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TokenDropdown>

export default meta
type Story = StoryObj<typeof meta>

const mockTokens = [
  { assetId: '0x1234567890abcdef1234567890abcdef12345678', ticker: 'USDT', name: 'Tether USD' },
  { assetId: '0xabcdef1234567890abcdef1234567890abcdef12', ticker: 'USDC', name: 'USD Coin' },
  { assetId: '0x9876543210fedcba9876543210fedcba98765432', ticker: 'DAI', name: 'Dai Stablecoin' },
  { assetId: '', ticker: 'XCH', name: 'Chia' },
  { assetId: '0x1111111111111111111111111111111111111111', ticker: 'WBTC', name: 'Wrapped Bitcoin' },
  { assetId: '0x2222222222222222222222222222222222222222', ticker: 'ETH', name: 'Ethereum' },
]

const TokenDropdownWrapper = () => {
  const [isOpen, setIsOpen] = useState(true)
  const [selectedToken, setSelectedToken] = useState<typeof mockTokens[0] | null>(null)

  return (
    <div className="w-full max-w-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg mb-4"
      >
        {isOpen ? 'Close' : 'Open'} Dropdown
      </button>
      {selectedToken && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {selectedToken.ticker} ({selectedToken.name})
        </p>
      )}
      <TokenDropdown
        tokens={mockTokens}
        isOpen={isOpen}
        onSelect={(token) => {
          setSelectedToken(token)
          setIsOpen(false)
        }}
        onClose={() => setIsOpen(false)}
        searchValue=""
      />
    </div>
  )
}

export const Default: Story = {
  args: {
    tokens: [],
    isOpen: false,
    onSelect: () => {},
    onClose: () => {},
    searchValue: '',
  },
  render: () => <TokenDropdownWrapper />,
}

export const WithSearchValue: Story = {
  args: {
    tokens: [],
    isOpen: false,
    onSelect: () => {},
    onClose: () => {},
    searchValue: '',
  },
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <div className="w-full max-w-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg mb-4"
        >
          {isOpen ? 'Close' : 'Open'} Dropdown
        </button>
        <TokenDropdown
          tokens={mockTokens}
          isOpen={isOpen}
          onSelect={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
          searchValue="US"
        />
      </div>
    )
  },
}

export const EmptyList: Story = {
  args: {
    tokens: [],
    isOpen: false,
    onSelect: () => {},
    onClose: () => {},
    searchValue: '',
  },
  render: () => {
    const [isOpen, setIsOpen] = useState(true)

    return (
      <div className="w-full max-w-md">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg mb-4"
        >
          {isOpen ? 'Close' : 'Open'} Dropdown
        </button>
        <TokenDropdown
          tokens={[]}
          isOpen={isOpen}
          onSelect={() => {}}
          onClose={() => setIsOpen(false)}
          searchValue=""
        />
      </div>
    )
  },
}
