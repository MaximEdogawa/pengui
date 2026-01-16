import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Modal, Button } from '@/shared/ui'

const meta = {
  title: 'Components/Primitives/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    maxWidth: {
      control: 'text',
    },
    closeOnOverlayClick: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onClose: () => {},
    children: (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Modal Title</h2>
        <p className="mb-4">This is a modal dialog with default styling.</p>
        <Button onClick={() => {}}>Close</Button>
      </div>
    ),
  },
}

export const Small: Story = {
  args: {
    onClose: () => {},
    maxWidth: 'max-w-md',
    children: (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Small Modal</h2>
        <p>This is a smaller modal dialog.</p>
      </div>
    ),
  },
}

export const Large: Story = {
  args: {
    onClose: () => {},
    maxWidth: 'max-w-7xl',
    children: (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Large Modal</h2>
        <p>This is a larger modal dialog with more content.</p>
      </div>
    ),
  },
}
