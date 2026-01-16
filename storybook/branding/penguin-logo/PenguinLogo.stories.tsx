import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PenguinLogo } from '@/shared/ui'

const meta = {
  title: 'Components/Branding/PenguinLogo',
  component: PenguinLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PenguinLogo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const Small: Story = {
  args: {
    size: 32,
  },
}

export const Medium: Story = {
  args: {
    size: 64,
  },
}

export const Large: Story = {
  args: {
    size: 128,
  },
}

export const WithCustomClassName: Story = {
  args: {
    size: 64,
    className: 'rounded-full border-2 border-cyan-500',
  },
}

export const FillContainer: Story = {
  render: () => (
    <div className="w-64 h-64 relative bg-slate-100 dark:bg-slate-800 rounded-lg">
      <PenguinLogo fill priority />
    </div>
  ),
}
