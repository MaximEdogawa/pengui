import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import LoanCard from '@/features/loans/ui/LoanCard'
import type { LoanOffer } from '@/entities/loan'

const meta = {
  title: 'Features/Loans/LoanCard',
  component: LoanCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    loan: {
      control: false,
    },
    type: {
      control: 'select',
      options: ['available', 'taken', 'created'],
    },
  },
} satisfies Meta<typeof LoanCard>

export default meta
type Story = StoryObj<typeof meta>

const mockAvailableLoan: LoanOffer = {
  id: 1,
  principal: {
    type: 'xch',
    amount: 1,
    assetId: '',
  },
  collateral: {
    type: 'cat',
    amount: 100,
    assetId: '0x1234567890abcdef',
  },
  interestRate: 5.5,
  duration: 30,
  lenderAddress: 'xch1lender123456',
  status: 'active',
}

const mockTakenLoan: LoanOffer = {
  ...mockAvailableLoan,
  id: 2,
  borrowerAddress: 'xch1borrower123456',
}

export const AvailableLoan: Story = {
  args: {
    loan: mockAvailableLoan,
    type: 'available',
    onTakeLoan: () => console.log('Take loan'),
    onViewDetails: () => console.log('View details'),
  },
}

export const TakenLoan: Story = {
  args: {
    loan: mockTakenLoan,
    type: 'taken',
    onPayment: () => console.log('Make payment'),
    onViewDetails: () => console.log('View details'),
  },
}

export const CreatedLoan: Story = {
  args: {
    loan: mockAvailableLoan,
    type: 'created',
    onViewDetails: () => console.log('View details'),
  },
}
