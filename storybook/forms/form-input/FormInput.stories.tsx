import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { useState } from 'react'
import { FormInput } from '@/shared/ui'

const meta = {
  title: 'Components/Forms/FormInput',
  component: FormInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    helperText: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
  },
} satisfies Meta<typeof FormInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
}

export const WithValue: Story = {
  args: {
    label: 'Username',
    value: 'john_doe',
    placeholder: 'Enter username',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    helperText: 'Must be at least 8 characters long',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    value: 'This field is disabled',
    disabled: true,
  },
}

export const NumberInput: Story = {
  args: {
    label: 'Amount',
    type: 'number',
    placeholder: '0.00',
    helperText: 'Enter amount in XCH',
  },
}

export const Interactive: Story = {
  args: {
    label: 'Interactive Input',
    placeholder: 'Type something...',
    value: '',
    onChange: () => {},
  },
  render: (args) => {
    const [value, setValue] = useState('')
    return (
      <div className="w-64">
        <FormInput
          {...args}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <p className="mt-2 text-xs text-gray-500">Value: {value || '(empty)'}</p>
      </div>
    )
  },
}
