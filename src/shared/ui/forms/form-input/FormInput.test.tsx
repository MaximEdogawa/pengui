import { describe, it, expect } from 'bun:test'
import { render, screen } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import FormInput from './FormInput'

describe('FormInput', () => {
  it('should render input with label', () => {
    render(<FormInput label="Test Label" name="test" />)
    expect(screen.getByLabelText('Test Label')).toBeInTheDocument()
  })

  it('should render input with ReactNode label', () => {
    render(
      <FormInput label={<span>Custom Label</span>} name="test" />
    )
    expect(screen.getByText('Custom Label')).toBeInTheDocument()
  })

  it('should display error message', () => {
    render(
      <FormInput label="Test" name="test" error="This is an error" />
    )
    expect(screen.getByText('This is an error')).toBeInTheDocument()
  })

  it('should display helper text when no error', () => {
    render(
      <FormInput label="Test" name="test" helperText="Helper text" />
    )
    expect(screen.getByText('Helper text')).toBeInTheDocument()
  })

  it('should not display helper text when error is present', () => {
    render(
      <FormInput
        label="Test"
        name="test"
        error="Error message"
        helperText="Helper text"
      />
    )
    expect(screen.getByText('Error message')).toBeInTheDocument()
    expect(screen.queryByText('Helper text')).not.toBeInTheDocument()
  })

  it('should handle input changes', async () => {
    render(<FormInput label="Test" name="test" />)
    const input = screen.getByLabelText('Test') as HTMLInputElement
    
    await userEvent.type(input, 'test value')
    expect(input.value).toBe('test value')
  })

  it('should pass through input props', () => {
    render(
      <FormInput
        label="Test"
        name="test"
        type="email"
        placeholder="Enter email"
        required
      />
    )
    const input = screen.getByLabelText('Test') as HTMLInputElement
    
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('placeholder', 'Enter email')
    expect(input).toBeRequired()
  })
})
