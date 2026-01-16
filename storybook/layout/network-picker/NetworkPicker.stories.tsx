import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NetworkPicker } from '@/shared/ui'

const meta = {
  title: 'Shared UI/Layout/NetworkPicker',
  component: NetworkPicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NetworkPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const InContainer: Story = {
  render: () => (
    <div className="p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      <div className="flex justify-end">
        <NetworkPicker />
      </div>
    </div>
  ),
}
