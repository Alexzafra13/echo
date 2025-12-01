import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';
import { Home } from 'lucide-react';

describe('Button', () => {
  describe('rendering', () => {
    it('should render button with children', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should apply default variant and size', () => {
      render(<Button>Default</Button>);

      const button = screen.getByRole('button');

      expect(button).toHaveClass('button');
      expect(button).toHaveClass('primary');
      expect(button).toHaveClass('md');
    });
  });

  describe('variants', () => {
    it('should render primary variant', () => {
      render(<Button variant="primary">Primary</Button>);

      expect(screen.getByRole('button')).toHaveClass('primary');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      expect(screen.getByRole('button')).toHaveClass('secondary');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);

      expect(screen.getByRole('button')).toHaveClass('outline');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      expect(screen.getByRole('button')).toHaveClass('ghost');
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);

      expect(screen.getByRole('button')).toHaveClass('sm');
    });

    it('should render medium size', () => {
      render(<Button size="md">Medium</Button>);

      expect(screen.getByRole('button')).toHaveClass('md');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);

      expect(screen.getByRole('button')).toHaveClass('lg');
    });
  });

  describe('fullWidth prop', () => {
    it('should apply fullWidth class when true', () => {
      render(<Button fullWidth>Full Width</Button>);

      expect(screen.getByRole('button')).toHaveClass('fullWidth');
    });

    it('should not apply fullWidth class when false', () => {
      render(<Button fullWidth={false}>Not Full Width</Button>);

      expect(screen.getByRole('button')).not.toHaveClass('fullWidth');
    });
  });

  describe('loading state', () => {
    it('should apply loading class when loading is true', () => {
      render(<Button loading>Loading</Button>);

      expect(screen.getByRole('button')).toHaveClass('loading');
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Loading</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = vi.fn();

      render(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn();

      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      );

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('icons', () => {
    it('should render left icon', () => {
      render(
        <Button leftIcon={<Home data-testid="left-icon" />}>
          With Left Icon
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(
        <Button rightIcon={<Home data-testid="right-icon" />}>
          With Right Icon
        </Button>
      );

      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render both icons', () => {
      render(
        <Button
          leftIcon={<Home data-testid="left-icon" />}
          rightIcon={<Home data-testid="right-icon" />}
        >
          With Both Icons
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should receive click event', () => {
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('should preserve default classes when custom className is provided', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');

      expect(button).toHaveClass('button');
      expect(button).toHaveClass('primary');
      expect(button).toHaveClass('md');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through other button attributes', () => {
      render(
        <Button type="submit" aria-label="Submit form">
          Submit
        </Button>
      );

      const button = screen.getByRole('button');

      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });
  });
});
