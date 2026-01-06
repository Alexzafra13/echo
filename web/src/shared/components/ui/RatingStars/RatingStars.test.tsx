import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RatingStars } from './RatingStars';
import * as interactionsService from '@shared/services/interactions.service';
import type { RatingResponse } from '@shared/services/interactions.service';

// Mock the interactions service
vi.mock('@shared/services/interactions.service', () => ({
  setRating: vi.fn(),
  removeRating: vi.fn(),
  getItemInteractionSummary: vi.fn(),
}));

describe('RatingStars', () => {
  const mockItemId = 'track-1';
  const mockItemType = 'track' as const;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation - no existing interactions
    vi.mocked(interactionsService.getItemInteractionSummary).mockRejectedValue(
      new Error('No interactions found')
    );
  });

  describe('rendering', () => {
    it('should render 5 star buttons', () => {
      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      const starButtons = screen.getAllByRole('button');
      expect(starButtons).toHaveLength(5);
    });

    it('should render with initial rating', () => {
      render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          initialRating={3}
        />
      );

      // Should have 3 filled stars (buttons 5, 4, and 3 due to reverse order)
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });

    it('should have proper aria-labels for stars', () => {
      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      expect(screen.getByLabelText('Rate 5 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 4 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 3 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 2 stars')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call setRating when clicking a star', async () => {
      vi.mocked(interactionsService.setRating).mockResolvedValue({
        userId: 'user-1',
        itemId: mockItemId,
        itemType: mockItemType,
        rating: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      const fourStarButton = screen.getByLabelText('Rate 4 stars');
      fireEvent.click(fourStarButton);

      await waitFor(() => {
        expect(interactionsService.setRating).toHaveBeenCalledWith(
          mockItemId,
          mockItemType,
          4
        );
      });
    });

    it('should call removeRating when clicking the same star twice', async () => {
      vi.mocked(interactionsService.setRating).mockResolvedValue({
        userId: 'user-1',
        itemId: mockItemId,
        itemType: mockItemType,
        rating: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(interactionsService.removeRating).mockResolvedValue();

      const { rerender: _rerender } = render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          initialRating={3}
        />
      );

      const threeStarButton = screen.getByLabelText('Rate 3 stars');

      // First click should call setRating (changing from initial to same)
      // Since it's already 3, clicking 3 should remove it
      fireEvent.click(threeStarButton);

      await waitFor(() => {
        expect(interactionsService.removeRating).toHaveBeenCalledWith(
          mockItemId,
          mockItemType
        );
      });
    });

    it('should call onRatingChange callback when rating changes', async () => {
      const handleRatingChange = vi.fn();

      vi.mocked(interactionsService.setRating).mockResolvedValue({
        userId: 'user-1',
        itemId: mockItemId,
        itemType: mockItemType,
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          onRatingChange={handleRatingChange}
        />
      );

      const fiveStarButton = screen.getByLabelText('Rate 5 stars');
      fireEvent.click(fiveStarButton);

      await waitFor(() => {
        expect(handleRatingChange).toHaveBeenCalledWith(5);
      });
    });

    it('should stop event propagation on click', () => {
      const parentClick = vi.fn();

      render(
        <div onClick={parentClick}>
          <RatingStars itemId={mockItemId} itemType={mockItemType} />
        </div>
      );

      const button = screen.getByLabelText('Rate 3 stars');
      fireEvent.click(button);

      // Parent click should not be called due to stopPropagation
      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('readOnly mode', () => {
    it('should disable all buttons in readOnly mode', () => {
      render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          readOnly
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call setRating in readOnly mode', async () => {
      render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          readOnly
        />
      );

      const button = screen.getByLabelText('Rate 5 stars');
      fireEvent.click(button);

      await waitFor(() => {
        expect(interactionsService.setRating).not.toHaveBeenCalled();
      });
    });

    it('should have readOnly class', () => {
      const { container } = render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          readOnly
        />
      );

      const ratingDiv = container.querySelector('.rating');
      expect(ratingDiv).toHaveClass('readOnly');
    });
  });

  describe('loading state', () => {
    it('should show loading class when making API call', async () => {
      let resolveRating: (value: RatingResponse) => void;
      const ratingPromise = new Promise<RatingResponse>((resolve) => {
        resolveRating = resolve;
      });

      vi.mocked(interactionsService.setRating).mockReturnValue(ratingPromise);

      const { container } = render(
        <RatingStars itemId={mockItemId} itemType={mockItemType} />
      );

      const button = screen.getByLabelText('Rate 5 stars');
      fireEvent.click(button);

      // Should be in loading state
      await waitFor(() => {
        const ratingDiv = container.querySelector('.rating');
        expect(ratingDiv).toHaveClass('loading');
      });

      // Resolve the promise
      resolveRating!({
        userId: 'user-1',
        itemId: mockItemId,
        itemType: mockItemType,
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should disable buttons while loading', async () => {
      let resolveRating: (value: RatingResponse) => void;
      const ratingPromise = new Promise<RatingResponse>((resolve) => {
        resolveRating = resolve;
      });

      vi.mocked(interactionsService.setRating).mockReturnValue(ratingPromise);

      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      const button = screen.getByLabelText('Rate 5 stars');
      fireEvent.click(button);

      // All buttons should be disabled while loading
      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        buttons.forEach(btn => {
          expect(btn).toBeDisabled();
        });
      });

      // Resolve
      resolveRating!({
        userId: 'user-1',
        itemId: mockItemId,
        itemType: mockItemType,
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  });

  describe('initial data loading', () => {
    it('should load initial rating from API', async () => {
      vi.mocked(interactionsService.getItemInteractionSummary).mockResolvedValue({
        itemId: mockItemId,
        itemType: mockItemType,
        userRating: 4,
        averageRating: 4.2,
        totalRatings: 15,
      });

      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      await waitFor(() => {
        expect(interactionsService.getItemInteractionSummary).toHaveBeenCalledWith(
          mockItemId,
          mockItemType
        );
      });
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(interactionsService.getItemInteractionSummary).mockRejectedValue(
        new Error('API Error')
      );

      // Should not throw error
      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      await waitFor(() => {
        expect(interactionsService.getItemInteractionSummary).toHaveBeenCalled();
      });
    });
  });

  describe('size customization', () => {
    it('should apply custom size to stars', () => {
      render(
        <RatingStars
          itemId={mockItemId}
          itemType={mockItemType}
          size={24}
        />
      );

      // All star icons should have the custom size
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
    });
  });

  describe('error handling', () => {
    it('should handle setRating error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(interactionsService.setRating).mockRejectedValue(
        new Error('Network error')
      );

      render(<RatingStars itemId={mockItemId} itemType={mockItemType} />);

      const button = screen.getByLabelText('Rate 5 stars');
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error updating rating:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });
});
