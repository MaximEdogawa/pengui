import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import LoginForm from '@/features/auth/login/ui/LoginForm'

const meta = {
  title: 'Features/Auth/LoginForm',
  component: LoginForm,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LoginForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
