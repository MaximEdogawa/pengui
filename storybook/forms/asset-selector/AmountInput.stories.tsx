import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { AmountInput } from '@/shared/ui'
import type { AssetType } from '@/entities/offer'

const meta = {
  title: 'Components/Forms/AmountInput',
  component: AmountInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AmountInput>

export default meta
type Story = StoryObj<typeof meta>

const AmountInputWrapper = ({ type }: { type: AssetType }) => {
  const [value, setValue] = useState<number | undefined>(undefined)
  const [tempInput, setTempInput] = useState<string | undefined>(undefined)

  return (
    <div className="w-64">
      <AmountInput
        value={value}
        tempInput={tempInput}
        type={type}
        onChange={(amount, temp) => {
          setValue(amount)
          setTempInput(temp)
        }}
        onBlur={() => setTempInput(undefined)}
      />
      <p className="mt-2 text-xs text-gray-500">Value: {value ?? 'undefined'}</p>
    </div>
  )
}

export const XCH: Story = {
  args: {
    value: undefined,
    tempInput: undefined,
    type: 'xch',
    onChange: () => {},
    onBlur: () => {},
  },
  render: () => <AmountInputWrapper type="xch" />,
}

export const CAT: Story = {
  args: {
    value: undefined,
    tempInput: undefined,
    type: 'cat',
    onChange: () => {},
    onBlur: () => {},
  },
  render: () => <AmountInputWrapper type="cat" />,
}

export const NFT: Story = {
  args: {
    value: undefined,
    tempInput: undefined,
    type: 'nft',
    onChange: () => {},
    onBlur: () => {},
  },
  render: () => <AmountInputWrapper type="nft" />,
}

export const Option: Story = {
  args: {
    value: undefined,
    tempInput: undefined,
    type: 'option',
    onChange: () => {},
    onBlur: () => {},
  },
  render: () => <AmountInputWrapper type="option" />,
}

export const WithValue: Story = {
  args: {
    value: undefined,
    tempInput: undefined,
    type: 'xch',
    onChange: () => {},
    onBlur: () => {},
  },
  render: () => {
    const [value, setValue] = useState<number | undefined>(1.5)
    const [tempInput, setTempInput] = useState<string | undefined>(undefined)

    return (
      <div className="w-64">
        <AmountInput
          value={value}
          tempInput={tempInput}
          type="xch"
          onChange={(amount, temp) => {
            setValue(amount)
            setTempInput(temp)
          }}
          onBlur={() => setTempInput(undefined)}
        />
      </div>
    )
  },
}
