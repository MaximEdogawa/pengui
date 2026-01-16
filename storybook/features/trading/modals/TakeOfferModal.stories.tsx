import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import TakeOfferModal from '@/features/trading/ui/modals/TakeOfferModal'
import { OrderBookFiltersProvider } from '@/features/trading/model/OrderBookFiltersProvider'
import type { OrderBookOrder } from '@/features/trading/lib/orderBookTypes'

const meta = {
  title: 'Features/Trading/Modals/TakeOfferModal',
  component: TakeOfferModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    order: {
      control: false,
    },
  },
  decorators: [
    (Story) => (
      <OrderBookFiltersProvider>
        <Story />
      </OrderBookFiltersProvider>
    ),
  ],
} satisfies Meta<typeof TakeOfferModal>

export default meta
type Story = StoryObj<typeof meta>

const mockOrder: OrderBookOrder = {
  id: '1',
  offering: [
    {
      id: '',
      code: 'XCH',
      amount: 1,
    },
  ],
  requesting: [
    {
      id: '0x1234567890abcdef',
      code: 'USDT',
      amount: 100,
    },
  ],
  timestamp: Date.now(),
}

export const Default: Story = {
  args: {
    order: mockOrder,
    onClose: () => {},
    onOfferTaken: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true)
    return (
      <>
        <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded">
          Open Modal
        </button>
        {isOpen && (
          <TakeOfferModal
            {...args}
            onClose={() => setIsOpen(false)}
          />
        )}
      </>
    )
  },
}
