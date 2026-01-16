import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RemoveAssetButton } from '@/shared/ui'

const meta = {
  title: 'Shared UI/Forms/RemoveAssetButton',
  component: RemoveAssetButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RemoveAssetButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onRemove: () => {
      console.log('Remove clicked')
    },
  },
}

export const InContext: Story = {
  args: {
    onRemove: () => {},
  },
  render: () => (
    <div className="flex items-center gap-2 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <span className="text-sm">Asset Name</span>
      <RemoveAssetButton
        onRemove={() => {
          console.log('Remove clicked')
        }}
      />
    </div>
  ),
}
