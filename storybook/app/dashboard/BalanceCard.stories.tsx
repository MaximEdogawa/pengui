import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BalanceCard } from '@/app/dashboard/components/BalanceCard'
import { useThemeClasses } from '@/shared/hooks'

const meta = {
  title: 'App/Dashboard/BalanceCard',
  component: BalanceCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BalanceCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    isDark: false,
    t: {} as any,
  },
  render: () => {
    const { isDark, t } = useThemeClasses()
    return <BalanceCard isDark={isDark} t={t} />
  },
}
