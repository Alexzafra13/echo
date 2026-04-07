import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import Input from './Input';
import { Search } from 'lucide-react';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      render(<Input />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should apply default size', () => {
      const { container } = render(<Input />);

      expect(container.firstChild).toHaveClass('md');
    });

    it('should generate unique id if not provided', () => {
      const { container } = render(<Input />);
      const input = container.querySelector('input');

      expect(input).toHaveAttribute('id');
      expect(input?.id).toBeTruthy();
    });
  });

  describe('label', () => {
    it('should render label when provided', () => {
      const { container } = render(<Input label="Username" />);

      const label = container.querySelector('label');
      expect(label).toBeInTheDocument();
      expect(label?.textContent).toBe('Username');
    });

    it('should associate label with input using htmlFor', () => {
      const { container } = render(<Input id="username" label="Username" />);

      const label = container.querySelector('label');
      expect(label).toHaveAttribute('for', 'username');
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { container } = render(<Input size="sm" />);

      expect(container.firstChild).toHaveClass('sm');
    });

    it('should render medium size', () => {
      const { container } = render(<Input size="md" />);

      expect(container.firstChild).toHaveClass('md');
    });

    it('should render large size', () => {
      const { container } = render(<Input size="lg" />);

      expect(container.firstChild).toHaveClass('lg');
    });
  });

  describe('error state', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" />);

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error class', () => {
      const { container } = render(<Input error="Error" />);

      expect(container.firstChild).toHaveClass('error');
    });

    it('should set aria-invalid when error exists', () => {
      render(<Input error="Error" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should have aria-describedby pointing to error', () => {
      render(<Input id="test" error="Error message" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should have role="alert" on error text', () => {
      render(<Input error="Error message" />);

      const errorText = screen.getByText('Error message');
      expect(errorText).toHaveAttribute('role', 'alert');
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<Input helperText="Enter your username" />);

      expect(screen.getByText('Enter your username')).toBeInTheDocument();
    });

    it('should hide helper text when error exists', () => {
      render(<Input helperText="Helper" error="Error" />);

      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should have aria-describedby pointing to helper when no error', () => {
      render(<Input id="test" helperText="Helper text" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-helper');
    });
  });

  describe('icons', () => {
    it('should render left icon', () => {
      render(<Input leftIcon={<Search data-testid="search-icon" />} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(<Input rightIcon={<Search data-testid="search-icon" />} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('should apply withLeftIcon class when left icon present', () => {
      const { container } = render(<Input leftIcon={<Search />} />);
      const inputContainer = container.querySelector('.inputContainer');

      expect(inputContainer).toHaveClass('withLeftIcon');
    });

    it('should apply withRightIcon class when right icon present', () => {
      const { container } = render(<Input rightIcon={<Search />} />);
      const inputContainer = container.querySelector('.inputContainer');

      expect(inputContainer).toHaveClass('withRightIcon');
    });
  });

  describe('password type', () => {
    it('should render password input', () => {
      const { container } = render(<Input type="password" />);

      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should show password toggle button for password type', () => {
      render(<Input type="password" />);

      const toggleButton = screen.getByLabelText(/mostrar contraseña/i);
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle password visibility when clicked', () => {
      const { container } = render(<Input type="password" />);

      const input = container.querySelector('input');
      const toggleButton = screen.getByLabelText(/mostrar contraseña/i);

      // Initially password type
      expect(input).toHaveAttribute('type', 'password');

      // Click to show
      fireEvent.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/ocultar contraseña/i)).toBeInTheDocument();

      // Click to hide again
      fireEvent.click(screen.getByLabelText(/ocultar contraseña/i));
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should not show toggle if custom rightIcon is provided', () => {
      render(
        <Input
          type="password"
          rightIcon={<Search data-testid="custom-icon" />}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
      expect(screen.queryByLabelText(/mostrar contraseña/i)).not.toBeInTheDocument();
    });
  });

  describe('forwardRef', () => {
    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();

      render(<Input ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow focus through ref', () => {
      const ref = createRef<HTMLInputElement>();

      render(<Input ref={ref} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('custom className', () => {
    it('should apply custom className to wrapper', () => {
      const { container } = render(<Input className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should preserve default classes', () => {
      const { container } = render(<Input className="custom-class" />);

      expect(container.firstChild).toHaveClass('wrapper');
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through standard input attributes', () => {
      render(
        <Input
          disabled
          required
          maxLength={10}
        />
      );

      const input = screen.getByRole('textbox');

      expect(input).toBeDisabled();
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('maxLength', '10');
    });

    it('should handle onChange event', () => {
      const handleChange = vi.fn();

      render(<Input onChange={handleChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Hello' } });

      expect(handleChange).toHaveBeenCalled();
    });

    it('should handle value prop', () => {
      render(<Input value="Test value" onChange={() => {}} />);

      const input = screen.getByDisplayValue('Test value');
      expect(input).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should not have aria-describedby when no error or helper', () => {
      render(<Input />);

      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('aria-describedby');
    });

    it('should have proper aria-invalid value', () => {
      const { rerender } = render(<Input />);

      let input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'false');

      rerender(<Input error="Error" />);
      input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
