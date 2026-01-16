import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import OfferDetailsModal from '@/features/offers/ui/OfferDetailsModal'
import type { OfferDetails } from '@/entities/offer'

const meta = {
  title: 'Features/Offers/OfferDetailsModal',
  component: OfferDetailsModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    offer: {
      control: false,
    },
  },
} satisfies Meta<typeof OfferDetailsModal>

export default meta
type Story = StoryObj<typeof meta>

const mockOffer: OfferDetails = {
  id: '1',
  offerString: 'offer1test123',
  status: 'active',
  createdAt: new Date(),
  offering: [
    {
      type: 'xch',
      amount: 1,
      assetId: '',
    },
  ],
  requesting: [
    {
      type: 'cat',
      amount: 100,
      assetId: '0x1234567890abcdef',
    },
  ],
  dexieOfferId: 'test123',
}

export const Default: Story = {
  args: {
    offer: mockOffer,
    onClose: () => {},
    onOfferCancelled: () => {},
    onOfferDeleted: () => {},
    onOfferUpdated: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true)
    return (
      <>
        <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-blue-500 text-white rounded">
          Open Modal
        </button>
        {isOpen && (
          <OfferDetailsModal
            {...args}
            onClose={() => setIsOpen(false)}
          />
        )}
      </>
    )
  },
}
