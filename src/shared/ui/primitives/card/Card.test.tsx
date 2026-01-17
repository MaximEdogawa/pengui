import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import Card from './Card'

describe('Card', () => {
  it('should render card with children', () => {
    render(
      <Card>
        <div>Card Content</div>
      </Card>
    )
    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    render(
      <Card className="custom-card">
        <div>Card Content</div>
      </Card>
    )

    const card = screen.getByText('Card Content').parentElement
    expect(card?.className).toContain('custom-card')
  })

  it('should render without className', () => {
    render(
      <Card>
        <div>Card Content</div>
      </Card>
    )

    expect(screen.getByText('Card Content')).toBeInTheDocument()
  })
})
