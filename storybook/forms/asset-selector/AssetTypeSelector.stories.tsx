import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { AssetTypeSelector } from '@/shared/ui'
import type { AssetType } from '@/entities/offer'

const meta = {
  title: 'Shared UI/Forms/AssetTypeSelector',
  component: AssetTypeSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AssetTypeSelector>

export default meta
type Story = StoryObj<typeof meta>

const AssetTypeSelectorWrapper = ({ enabledTypes }: { enabledTypes: AssetType[] }) => {
  const [value, setValue] = useState<AssetType>(enabledTypes[0] || 'cat')

  return (
    <div className="w-64">
      <AssetTypeSelector
        value={value}
        onChange={setValue}
        enabledAssetTypes={enabledTypes}
      />
      <p className="mt-2 text-xs text-gray-500">Selected: {value}</p>
    </div>
  )
}

export const AllTypes: Story = {
  args: {
    value: 'cat',
    onChange: () => {},
    enabledAssetTypes: [],
  },
  render: () => <AssetTypeSelectorWrapper enabledTypes={['cat', 'nft', 'option']} />,
}

export const CATOnly: Story = {
  args: {
    value: 'cat',
    onChange: () => {},
    enabledAssetTypes: [],
  },
  render: () => <AssetTypeSelectorWrapper enabledTypes={['cat']} />,
}

export const CATAndNFT: Story = {
  args: {
    value: 'cat',
    onChange: () => {},
    enabledAssetTypes: [],
  },
  render: () => <AssetTypeSelectorWrapper enabledTypes={['cat', 'nft']} />,
}

export const CATAndOption: Story = {
  args: {
    value: 'cat',
    onChange: () => {},
    enabledAssetTypes: [],
  },
  render: () => <AssetTypeSelectorWrapper enabledTypes={['cat', 'option']} />,
}
