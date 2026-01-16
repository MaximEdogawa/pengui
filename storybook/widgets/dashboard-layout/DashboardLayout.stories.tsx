import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import DashboardLayout from '@/widgets/dashboard-layout/ui/DashboardLayout'

const meta = {
  title: 'Widgets/DashboardLayout/DashboardLayout',
  component: DashboardLayout,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/dashboard',
        query: {},
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DashboardLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard Content</h1>
        <p>This is the main content area of the dashboard.</p>
      </div>
    ),
  },
}
