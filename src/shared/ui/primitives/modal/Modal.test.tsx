import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

describe('Modal', () => {
  it('should render modal with children', () => {
    const onClose = () => {}
    render(
      <Modal onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    )
    expect(screen.getByText('Modal Content')).toBeInTheDocument()
  })

  it('should call onClose when clicking overlay', async () => {
    let closed = false
    const onClose = () => {
      closed = true
    }

    render(
      <Modal onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    )

    // Find the overlay (the outer div)
    const overlay = screen.getByText('Modal Content').closest('.fixed')
    if (overlay) {
      // Click on the overlay itself, not the content
      await userEvent.click(overlay)
      expect(closed).toBe(true)
    }
  })

  it('should not call onClose when clicking content', async () => {
    let closed = false
    const onClose = () => {
      closed = true
    }

    render(
      <Modal onClose={onClose}>
        <div>Modal Content</div>
      </Modal>
    )

    // Click on the content, not the overlay
    const content = screen.getByText('Modal Content')
    await userEvent.click(content)
    expect(closed).toBe(false)
  })

  it('should not call onClose when closeOnOverlayClick is false', async () => {
    let closed = false
    const onClose = () => {
      closed = true
    }

    render(
      <Modal onClose={onClose} closeOnOverlayClick={false}>
        <div>Modal Content</div>
      </Modal>
    )

    const overlay = screen.getByText('Modal Content').closest('.fixed')
    if (overlay) {
      await userEvent.click(overlay)
      expect(closed).toBe(false)
    }
  })

  it('should apply custom maxWidth', () => {
    const onClose = () => {}
    render(
      <Modal onClose={onClose} maxWidth="max-w-2xl">
        <div>Modal Content</div>
      </Modal>
    )

    const modalContent = screen.getByText('Modal Content').closest('.max-w-2xl')
    expect(modalContent).toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const onClose = () => {}
    render(
      <Modal onClose={onClose} className="custom-modal">
        <div>Modal Content</div>
      </Modal>
    )

    const modalContent = screen.getByText('Modal Content').closest('.custom-modal')
    expect(modalContent).toBeInTheDocument()
  })
})
