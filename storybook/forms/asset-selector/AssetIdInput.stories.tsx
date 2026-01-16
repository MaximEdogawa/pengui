import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { AssetIdInput } from '@/shared/ui'

const meta = {
  title: 'Shared UI/Forms/AssetIdInput',
  component: AssetIdInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AssetIdInput>

export default meta
type Story = StoryObj<typeof meta>

const AssetIdInputWrapper = () => {
  const [value, setValue] = useState('')

  return (
    <div className="w-64">
      <AssetIdInput
        value={value}
        onChange={setValue}
        placeholder="Enter asset ID"
      />
      <p className="mt-2 text-xs text-gray-500">Value: {value || '(empty)'}</p>
    </div>
  )
}

export const Default: Story = {
  args: {
    value: '',
    onChange: () => {},
    placeholder: '',
  },
  render: () => <AssetIdInputWrapper />,
}

export const WithValue: Story = {
  args: {
    value: '',
    onChange: () => {},
    placeholder: '',
  },
  render: () => {
    const [value, setValue] = useState('0x1234567890abcdef1234567890abcdef12345678')

    return (
      <div className="w-64">
        <AssetIdInput
          value={value}
          onChange={setValue}
          placeholder="Enter asset ID"
        />
      </div>
    )
  },
}

export const CustomPlaceholder: Story = {
  args: {
    value: '',
    onChange: () => {},
    placeholder: '',
  },
  render: () => {
    const [value, setValue] = useState('')

    return (
      <div className="w-64">
        <AssetIdInput
          value={value}
          onChange={setValue}
          placeholder="Paste asset ID here..."
        />
      </div>
    )
  },
}
