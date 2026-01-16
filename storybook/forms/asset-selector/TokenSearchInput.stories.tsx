import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { TokenSearchInput } from '@/shared/ui'

const meta = {
  title: 'Shared UI/Forms/TokenSearchInput',
  component: TokenSearchInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TokenSearchInput>

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

const TokenSearchInputWrapper = () => {
  const [value, setValue] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedToken, setSelectedToken] = useState<typeof mockTokens[0] | null>(null)

  const filteredTokens = mockTokens.filter(
    (token) =>
      token.ticker.toLowerCase().includes(value.toLowerCase()) ||
      token.name?.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div className="w-full max-w-md">
      <TokenSearchInput
        value={value}
        onChange={setValue}
        onFocus={() => setIsDropdownOpen(true)}
        onBlur={() => {
          // Delay closing to allow dropdown clicks
          setTimeout(() => setIsDropdownOpen(false), 200)
        }}
        placeholder="Search tokens..."
        disabled={false}
        filteredTokens={filteredTokens}
        onSelectToken={(token) => {
          setSelectedToken(token)
          setValue(token.ticker)
          setIsDropdownOpen(false)
        }}
        isDropdownOpen={isDropdownOpen}
        onCloseDropdown={() => setIsDropdownOpen(false)}
      />
      {selectedToken && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {selectedToken.ticker} ({selectedToken.name})
        </p>
      )}
    </div>
  )
}

export const Default: Story = {
  args: {
    value: '',
    onChange: () => {},
    onFocus: () => {},
    onBlur: () => {},
    placeholder: '',
    disabled: false,
    filteredTokens: [],
    onSelectToken: () => {},
    isDropdownOpen: false,
    onCloseDropdown: () => {},
  },
  render: () => <TokenSearchInputWrapper />,
}

export const Disabled: Story = {
  args: {
    value: '',
    onChange: () => {},
    onFocus: () => {},
    onBlur: () => {},
    placeholder: '',
    disabled: false,
    filteredTokens: [],
    onSelectToken: () => {},
    isDropdownOpen: false,
    onCloseDropdown: () => {},
  },
  render: () => {
    const [value, setValue] = useState('')

    return (
      <div className="w-full max-w-md">
        <TokenSearchInput
          value={value}
          onChange={setValue}
          onFocus={() => {}}
          onBlur={() => {}}
          placeholder="Search tokens..."
          disabled={true}
          filteredTokens={[]}
          onSelectToken={() => {}}
          isDropdownOpen={false}
          onCloseDropdown={() => {}}
        />
      </div>
    )
  },
}

export const WithInitialValue: Story = {
  args: {
    value: '',
    onChange: () => {},
    onFocus: () => {},
    onBlur: () => {},
    placeholder: '',
    disabled: false,
    filteredTokens: [],
    onSelectToken: () => {},
    isDropdownOpen: false,
    onCloseDropdown: () => {},
  },
  render: () => {
    const [value, setValue] = useState('USDT')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    const filteredTokens = mockTokens.filter(
      (token) =>
        token.ticker.toLowerCase().includes(value.toLowerCase()) ||
        token.name?.toLowerCase().includes(value.toLowerCase())
    )

    return (
      <div className="w-full max-w-md">
        <TokenSearchInput
          value={value}
          onChange={setValue}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
          placeholder="Search tokens..."
          disabled={false}
          filteredTokens={filteredTokens}
          onSelectToken={(token) => {
            setValue(token.ticker)
            setIsDropdownOpen(false)
          }}
          isDropdownOpen={isDropdownOpen}
          onCloseDropdown={() => setIsDropdownOpen(false)}
        />
      </div>
    )
  },
}
