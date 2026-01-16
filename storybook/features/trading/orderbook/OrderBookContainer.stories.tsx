import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import OrderBookContainer from '@/features/trading/ui/orderbook/OrderBookContainer'
import { OrderBookFiltersProvider } from '@/features/trading/model/OrderBookFiltersProvider'
import type { OrderBookOrder } from '@/features/trading/lib/orderBookTypes'

const meta = {
  title: 'Features/Trading/Orderbook/OrderBookContainer',
  component: OrderBookContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    filters: {
      control: false,
    },
    onOrderClick: {
      action: 'order-clicked',
    },
  },
  decorators: [
    (Story) => (
      <OrderBookFiltersProvider>
        <div className="h-screen p-4">
          <Story />
        </div>
      </OrderBookFiltersProvider>
    ),
  ],
} satisfies Meta<typeof OrderBookContainer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onOrderClick: (order: OrderBookOrder) => {
      console.log('Order clicked:', order)
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Orderbook with mocked data showing buy and sell orders. The data is automatically generated with realistic prices and amounts.',
      },
    },
  },
}

export const WithFilters: Story = {
  args: {
    filters: {
      buyAsset: ['XCH'],
      sellAsset: ['USDT'],
    },
    onOrderClick: (order: OrderBookOrder) => {
      console.log('Order clicked:', order)
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Orderbook filtered to show only XCH/USDT orders. The mock data is filtered based on the provided asset filters.',
      },
    },
  },
}

export const Empty: Story = {
  args: {
    filters: {
      buyAsset: ['NONEXISTENT'],
      sellAsset: ['NONEXISTENT'],
    },
    onOrderClick: (order: OrderBookOrder) => {
      console.log('Order clicked:', order)
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Empty orderbook state when no orders match the filters. This demonstrates the empty state UI.',
      },
    },
  },
}
