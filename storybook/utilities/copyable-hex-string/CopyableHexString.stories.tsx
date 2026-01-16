import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CopyableHexString } from '@/shared/ui'

const meta = {
  title: 'Shared UI/Utility/CopyableHexString',
  component: CopyableHexString,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CopyableHexString>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    hexString: '0x1234567890abcdef1234567890abcdef12345678',
  },
}

export const ShortHex: Story = {
  args: {
    hexString: '0x1234',
  },
}

export const LongHex: Story = {
  args: {
    hexString: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
  },
}

export const CustomTooltip: Story = {
  args: {
    hexString: '0x1234567890abcdef1234567890abcdef12345678',
    tooltipText: 'Click to copy',
  },
}

export const CustomClassName: Story = {
  args: {
    hexString: '0x1234567890abcdef1234567890abcdef12345678',
    className: 'text-lg font-bold',
  },
}
