import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import Button from './Button'
import { Plus } from 'lucide-react'

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should call onClick when clicked', async () => {
    let clicked = false
    const onClick = () => {
      clicked = true
    }

    render(<Button onClick={onClick}>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    
    await userEvent.click(button)
    expect(clicked).toBe(true)
  })

  it('should not call onClick when disabled', async () => {
    let clicked = false
    const onClick = () => {
      clicked = true
    }

    render(
      <Button onClick={onClick} disabled>
        Click me
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Click me' })
    
    await userEvent.click(button)
    expect(clicked).toBe(false)
    expect(button).toBeDisabled()
  })

  it('should render with different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()

    rerender(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button', { name: 'Danger' })).toBeInTheDocument()

    rerender(<Button variant="success">Success</Button>)
    expect(screen.getByRole('button', { name: 'Success' })).toBeInTheDocument()
  })

  it('should render with different sizes', () => {
    render(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button', { name: 'Small' })).toBeInTheDocument()

    const { rerender } = render(<Button size="md">Medium</Button>)
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument()

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button', { name: 'Large' })).toBeInTheDocument()
  })

  it('should render with icon', () => {
    render(
      <Button icon={Plus}>
        Add Item
      </Button>
    )
    const button = screen.getByRole('button', { name: 'Add Item' })
    expect(button).toBeInTheDocument()
    // Icon should be present (lucide-react icons render as SVG)
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should render full width button', () => {
    render(<Button fullWidth>Full Width</Button>)
    const button = screen.getByRole('button', { name: 'Full Width' })
    expect(button).toHaveClass('w-full')
  })

  it('should render with custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button', { name: 'Custom' })
    expect(button.className).toContain('custom-class')
  })

  it('should render with different button types', () => {
    render(<Button type="submit">Submit</Button>)
    const button = screen.getByRole('button', { name: 'Submit' })
    expect(button).toHaveAttribute('type', 'submit')

    render(<Button type="reset">Reset</Button>)
    const resetButton = screen.getByRole('button', { name: 'Reset' })
    expect(resetButton).toHaveAttribute('type', 'reset')
  })
})
