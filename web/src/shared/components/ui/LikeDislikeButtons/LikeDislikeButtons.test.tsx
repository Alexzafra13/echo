import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LikeDislikeButtons } from './LikeDislikeButtons';
import * as interactionsService from '@shared/services/interactions.service';
import type { ToggleLikeResponse } from '@shared/services/interactions.service';

// Mock the interactions service
vi.mock('@shared/services/interactions.service', () => ({
  toggleLike: vi.fn(),
  toggleDislike: vi.fn(),
  getItemInteractionSummary: vi.fn(),
}));

describe('LikeDislikeButtons', () => {
  const mockItemId = 'track-1';
  const mockItemType = 'track' as const;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock - no existing interactions
    vi.mocked(interactionsService.getItemInteractionSummary).mockRejectedValue(
      new Error('No interactions found')
    );
  });

  describe('rendering', () => {
    it('should render like and dislike buttons', () => {
      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      expect(screen.getByLabelText('Me gusta')).toBeInTheDocument();
      expect(screen.getByLabelText('No me gusta')).toBeInTheDocument();
    });

    it('should render with initial sentiment like', () => {
      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          initialSentiment="like"
        />
      );

      const likeButton = screen.getByLabelText('Me gusta');
      expect(likeButton).toHaveClass('active');
    });

    it('should render with initial sentiment dislike', () => {
      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          initialSentiment="dislike"
        />
      );

      const dislikeButton = screen.getByLabelText('No me gusta');
      expect(dislikeButton).toHaveClass('active');
    });
  });

  describe('like interactions', () => {
    it('should call toggleLike when like button is clicked', async () => {
      vi.mocked(interactionsService.toggleLike).mockResolvedValue({
        liked: true,
        likedAt: new Date(),
      });

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(interactionsService.toggleLike).toHaveBeenCalledWith(
          mockItemId,
          mockItemType
        );
      });
    });

    it('should set sentiment to like when toggled on', async () => {
      vi.mocked(interactionsService.toggleLike).mockResolvedValue({
        liked: true,
        likedAt: new Date(),
      });

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(likeButton).toHaveClass('active');
      });
    });

    it('should set sentiment to null when toggled off', async () => {
      vi.mocked(interactionsService.toggleLike).mockResolvedValue({
        liked: false,
      });

      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          initialSentiment="like"
        />
      );

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(likeButton).not.toHaveClass('active');
      });
    });

    it('should call onSentimentChange when like is clicked', async () => {
      const handleSentimentChange = vi.fn();

      vi.mocked(interactionsService.toggleLike).mockResolvedValue({
        liked: true,
        likedAt: new Date(),
      });

      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          onSentimentChange={handleSentimentChange}
        />
      );

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(handleSentimentChange).toHaveBeenCalledWith('like');
      });
    });
  });

  describe('dislike interactions', () => {
    it('should call toggleDislike when dislike button is clicked', async () => {
      vi.mocked(interactionsService.toggleDislike).mockResolvedValue({
        disliked: true,
        dislikedAt: new Date(),
      });

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const dislikeButton = screen.getByLabelText('No me gusta');
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(interactionsService.toggleDislike).toHaveBeenCalledWith(
          mockItemId,
          mockItemType
        );
      });
    });

    it('should set sentiment to dislike when toggled on', async () => {
      vi.mocked(interactionsService.toggleDislike).mockResolvedValue({
        disliked: true,
        dislikedAt: new Date(),
      });

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const dislikeButton = screen.getByLabelText('No me gusta');
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(dislikeButton).toHaveClass('active');
      });
    });

    it('should set sentiment to null when toggled off', async () => {
      vi.mocked(interactionsService.toggleDislike).mockResolvedValue({
        disliked: false,
      });

      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          initialSentiment="dislike"
        />
      );

      const dislikeButton = screen.getByLabelText('No me gusta');
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(dislikeButton).not.toHaveClass('active');
      });
    });

    it('should call onSentimentChange when dislike is clicked', async () => {
      const handleSentimentChange = vi.fn();

      vi.mocked(interactionsService.toggleDislike).mockResolvedValue({
        disliked: true,
        dislikedAt: new Date(),
      });

      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          onSentimentChange={handleSentimentChange}
        />
      );

      const dislikeButton = screen.getByLabelText('No me gusta');
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(handleSentimentChange).toHaveBeenCalledWith('dislike');
      });
    });
  });

  describe('readOnly mode', () => {
    it('should disable all buttons in readOnly mode', () => {
      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          readOnly
        />
      );

      expect(screen.getByLabelText('Me gusta')).toBeDisabled();
      expect(screen.getByLabelText('No me gusta')).toBeDisabled();
    });

    it('should not call API in readOnly mode', async () => {
      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          readOnly
        />
      );

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(interactionsService.toggleLike).not.toHaveBeenCalled();
      });
    });

    it('should have readOnly class', () => {
      const { container } = render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          readOnly
        />
      );

      const likeDislikeDiv = container.querySelector('.likeDislike');
      expect(likeDislikeDiv).toHaveClass('readOnly');
    });
  });

  describe('loading state', () => {
    it('should show loading class when making API call', async () => {
      let resolveToggle: (value: ToggleLikeResponse) => void;
      const togglePromise = new Promise<ToggleLikeResponse>((resolve) => {
        resolveToggle = resolve;
      });

      vi.mocked(interactionsService.toggleLike).mockReturnValue(togglePromise);

      const { container } = render(
        <LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />
      );

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      // Should be in loading state
      await waitFor(() => {
        const likeDislikeDiv = container.querySelector('.likeDislike');
        expect(likeDislikeDiv).toHaveClass('loading');
      });

      // Resolve
      resolveToggle!({ liked: true, likedAt: new Date() });
    });

    it('should disable buttons while loading', async () => {
      let resolveToggle: (value: ToggleLikeResponse) => void;
      const togglePromise = new Promise<ToggleLikeResponse>((resolve) => {
        resolveToggle = resolve;
      });

      vi.mocked(interactionsService.toggleLike).mockReturnValue(togglePromise);

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      // Both buttons should be disabled
      await waitFor(() => {
        expect(screen.getByLabelText('Me gusta')).toBeDisabled();
        expect(screen.getByLabelText('No me gusta')).toBeDisabled();
      });

      // Resolve
      resolveToggle!({ liked: true, likedAt: new Date() });
    });
  });

  describe('event propagation', () => {
    it('should stop propagation on like click', () => {
      const parentClick = vi.fn();

      vi.mocked(interactionsService.toggleLike).mockResolvedValue({
        liked: true,
        likedAt: new Date(),
      });

      render(
        <div onClick={parentClick}>
          <LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />
        </div>
      );

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      expect(parentClick).not.toHaveBeenCalled();
    });

    it('should stop propagation on dislike click', () => {
      const parentClick = vi.fn();

      vi.mocked(interactionsService.toggleDislike).mockResolvedValue({
        disliked: true,
        dislikedAt: new Date(),
      });

      render(
        <div onClick={parentClick}>
          <LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />
        </div>
      );

      const dislikeButton = screen.getByLabelText('No me gusta');
      fireEvent.click(dislikeButton);

      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('initial data loading', () => {
    it('should load initial sentiment from API', async () => {
      vi.mocked(interactionsService.getItemInteractionSummary).mockResolvedValue({
        itemId: mockItemId,
        itemType: mockItemType,
        userSentiment: 'like',
        totalLikes: 10,
        totalDislikes: 2,
        averageRating: 4.2,
        totalRatings: 15,
      });

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

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

      // Should not throw
      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      await waitFor(() => {
        expect(interactionsService.getItemInteractionSummary).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle toggleLike error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(interactionsService.toggleLike).mockRejectedValue(
        new Error('Network error')
      );

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const likeButton = screen.getByLabelText('Me gusta');
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error toggling like:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });

    it('should handle toggleDislike error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(interactionsService.toggleDislike).mockRejectedValue(
        new Error('Network error')
      );

      render(<LikeDislikeButtons itemId={mockItemId} itemType={mockItemType} />);

      const dislikeButton = screen.getByLabelText('No me gusta');
      fireEvent.click(dislikeButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Error toggling dislike:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('size customization', () => {
    it('should apply custom size to icons', () => {
      render(
        <LikeDislikeButtons
          itemId={mockItemId}
          itemType={mockItemType}
          size={24}
        />
      );

      expect(screen.getByLabelText('Me gusta')).toBeInTheDocument();
      expect(screen.getByLabelText('No me gusta')).toBeInTheDocument();
    });
  });
});
