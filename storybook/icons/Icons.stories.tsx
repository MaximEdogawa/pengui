import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { GithubIcon, XIcon } from '@/shared/ui'

const meta = {
  title: 'Components/Icons',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const GithubIconStory: Story = {
  render: () => (
    <div className="p-8 bg-slate-900">
      <GithubIcon />
    </div>
  ),
}

export const XIconStory: Story = {
  render: () => (
    <div className="p-8 bg-slate-900">
      <XIcon />
    </div>
  ),
}

export const AllIcons: Story = {
  render: () => (
    <div className="p-8 space-y-4">
      <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg">
        <GithubIcon />
        <span className="text-white">GithubIcon</span>
      </div>
      <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg">
        <XIcon />
        <span className="text-white">XIcon</span>
      </div>
    </div>
  ),
}

export const IconsOnLightBackground: Story = {
  render: () => (
    <div className="p-8 space-y-4 bg-white">
      <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg">
        <div className="p-2 bg-slate-900 rounded">
          <GithubIcon />
        </div>
        <span className="text-slate-900">GithubIcon</span>
      </div>
      <div className="flex items-center gap-4 p-4 bg-slate-100 rounded-lg">
        <div className="p-2 bg-slate-900 rounded">
          <XIcon />
        </div>
        <span className="text-slate-900">XIcon</span>
      </div>
    </div>
  ),
}
