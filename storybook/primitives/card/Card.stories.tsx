import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Card } from '@/shared/ui'

const meta = {
  title: 'Components/Primitives/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Card content goes here',
  },
}

export const WithMultipleChildren: Story = {
  args: {
    children: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Card Title</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This is a card with multiple children elements.
        </p>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Action Button</button>
      </div>
    ),
  },
}

export const WithCustomClassName: Story = {
  args: {
    className: 'max-w-md',
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">Custom Width Card</h3>
        <p className="text-sm">This card has a custom max-width class applied.</p>
      </div>
    ),
  },
}
