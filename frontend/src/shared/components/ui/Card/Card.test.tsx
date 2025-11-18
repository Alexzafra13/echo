import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from './Card';

describe('Card', () => {
  describe('rendering', () => {
    it('should render children', () => {
      render(
        <Card>
          <p>Card content</p>
        </Card>
      );

      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should apply default variant and padding', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild;

      expect(card).toHaveClass('card');
      expect(card).toHaveClass('default');
      expect(card).toHaveClass('padding-md');
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      const { container } = render(<Card variant="default">Content</Card>);

      expect(container.firstChild).toHaveClass('default');
    });

    it('should render elevated variant', () => {
      const { container } = render(<Card variant="elevated">Content</Card>);

      expect(container.firstChild).toHaveClass('elevated');
    });

    it('should render glass variant', () => {
      const { container } = render(<Card variant="glass">Content</Card>);

      expect(container.firstChild).toHaveClass('glass');
    });

    it('should render white variant', () => {
      const { container } = render(<Card variant="white">Content</Card>);

      expect(container.firstChild).toHaveClass('white');
    });
  });

  describe('padding', () => {
    it('should render with no padding', () => {
      const { container } = render(<Card padding="none">Content</Card>);

      expect(container.firstChild).toHaveClass('padding-none');
    });

    it('should render with small padding', () => {
      const { container } = render(<Card padding="sm">Content</Card>);

      expect(container.firstChild).toHaveClass('padding-sm');
    });

    it('should render with medium padding', () => {
      const { container } = render(<Card padding="md">Content</Card>);

      expect(container.firstChild).toHaveClass('padding-md');
    });

    it('should render with large padding', () => {
      const { container } = render(<Card padding="lg">Content</Card>);

      expect(container.firstChild).toHaveClass('padding-lg');
    });
  });

  describe('interactive prop', () => {
    it('should apply interactive class when true', () => {
      const { container } = render(<Card interactive>Content</Card>);

      expect(container.firstChild).toHaveClass('interactive');
    });

    it('should not apply interactive class when false', () => {
      const { container } = render(<Card interactive={false}>Content</Card>);

      expect(container.firstChild).not.toHaveClass('interactive');
    });
  });

  describe('bordered prop', () => {
    it('should apply bordered class when true', () => {
      const { container } = render(<Card bordered>Content</Card>);

      expect(container.firstChild).toHaveClass('bordered');
    });

    it('should not apply bordered class when false', () => {
      const { container } = render(<Card bordered={false}>Content</Card>);

      expect(container.firstChild).not.toHaveClass('bordered');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Content</Card>);

      expect(container.firstChild).toHaveClass('custom-card');
    });

    it('should preserve default classes', () => {
      const { container } = render(<Card className="custom-card">Content</Card>);
      const card = container.firstChild;

      expect(card).toHaveClass('card');
      expect(card).toHaveClass('default');
      expect(card).toHaveClass('padding-md');
      expect(card).toHaveClass('custom-card');
    });
  });

  describe('HTML attributes', () => {
    it('should pass through div attributes', () => {
      render(
        <Card data-testid="test-card" role="region" aria-label="Test Card">
          Content
        </Card>
      );

      const card = screen.getByTestId('test-card');

      expect(card).toHaveAttribute('role', 'region');
      expect(card).toHaveAttribute('aria-label', 'Test Card');
    });

    it('should handle onClick events', () => {
      const handleClick = vi.fn();

      render(
        <Card onClick={handleClick} data-testid="clickable-card">
          Content
        </Card>
      );

      const card = screen.getByTestId('clickable-card');
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('combinations', () => {
    it('should handle multiple props together', () => {
      const { container } = render(
        <Card
          variant="elevated"
          padding="lg"
          interactive
          bordered
          className="custom"
        >
          Content
        </Card>
      );

      const card = container.firstChild;

      expect(card).toHaveClass('card');
      expect(card).toHaveClass('elevated');
      expect(card).toHaveClass('padding-lg');
      expect(card).toHaveClass('interactive');
      expect(card).toHaveClass('bordered');
      expect(card).toHaveClass('custom');
    });
  });

  describe('children rendering', () => {
    it('should render multiple children', () => {
      render(
        <Card>
          <h2>Title</h2>
          <p>Description</p>
        </Card>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render complex children', () => {
      render(
        <Card>
          <div>
            <button>Action</button>
            <span>Text</span>
          </div>
        </Card>
      );

      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });
});
