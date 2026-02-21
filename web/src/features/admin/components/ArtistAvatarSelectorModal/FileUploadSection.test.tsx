import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUploadSection } from './FileUploadSection';

// Mock UI components
vi.mock('@shared/components/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    loading,
    fullWidth,
    size,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    size?: string;
    variant?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      data-fullwidth={fullWidth}
      data-size={size}
      data-variant={variant}
    >
      {loading ? 'Loading...' : children}
    </button>
  ),
}));

// Mock file upload hook
const mockHandleFileSelect = vi.fn();
const mockResetInput = vi.fn();
const mockFileInputRef = { current: null };

const mockFileUploadState = {
  selectedFile: null as File | null,
  previewUrl: null as string | null,
  error: null as string | null,
};

vi.mock('@shared/hooks/useFileUpload', () => ({
  useFileUpload: ({ onError: _onError }: { onError?: (error: string) => void }) => ({
    selectedFile: mockFileUploadState.selectedFile,
    previewUrl: mockFileUploadState.previewUrl,
    error: mockFileUploadState.error,
    handleFileSelect: mockHandleFileSelect,
    resetInput: mockResetInput,
    fileInputRef: mockFileInputRef,
  }),
}));

// Mock format utility
vi.mock('@shared/utils/format', () => ({
  formatFileSize: (size: number) => `${(size / 1024).toFixed(1)} KB`,
}));

// Mock hooks
const mockUploadImage = vi.fn();
const mockApplyImage = vi.fn();
const mockDeleteImage = vi.fn();

const mockState = {
  customImages: [] as Array<{
    id: string;
    fileName: string;
    fileSize: string;
    imageType: string;
    isActive: boolean;
  }>,
  isLoadingCustomImages: false,
};

vi.mock('../../hooks/useArtistAvatars', () => ({
  useUploadCustomImage: () => ({
    mutate: mockUploadImage,
    isPending: false,
  }),
  useListCustomImages: () => ({
    data: { customImages: mockState.customImages },
    isLoading: mockState.isLoadingCustomImages,
  }),
  useApplyCustomImage: () => ({
    mutate: mockApplyImage,
    isPending: false,
  }),
  useDeleteCustomImage: () => ({
    mutate: mockDeleteImage,
    isPending: false,
  }),
}));

// Mock logger and error utils
vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: () => 'Error message',
}));

describe('FileUploadSection', () => {
  const defaultProps = {
    artistId: 'artist-123',
    imageType: 'profile' as const,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFileUploadState.selectedFile = null;
    mockFileUploadState.previewUrl = null;
    mockFileUploadState.error = null;
    mockState.customImages = [];
    mockState.isLoadingCustomImages = false;
  });

  describe('Upload Section', () => {
    it('should render section title', () => {
      render(<FileUploadSection {...defaultProps} />);
      expect(screen.getByText('Subir desde tu PC')).toBeInTheDocument();
    });

    it('should render file input', () => {
      render(<FileUploadSection {...defaultProps} />);
      expect(screen.getByLabelText(/haz clic para seleccionar/i)).toBeInTheDocument();
    });

    it('should render upload hint', () => {
      render(<FileUploadSection {...defaultProps} />);
      expect(screen.getByText(/jpeg, png o webp/i)).toBeInTheDocument();
    });

    it('should accept correct file types', () => {
      render(<FileUploadSection {...defaultProps} />);
      const input = document.querySelector('input[type="file"]');
      expect(input).toHaveAttribute('accept', 'image/jpeg,image/jpg,image/png,image/webp');
    });
  });

  describe('File Preview', () => {
    it('should show preview when file selected', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText('Vista previa')).toBeInTheDocument();
    });

    it('should show file name in preview', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'my-image.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText('my-image.jpg')).toBeInTheDocument();
    });

    it('should show file size in preview', () => {
      const file = new File(['test content here'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.selectedFile = file;
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      // File size should be formatted
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });

    it('should render preview image', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });

    it('should show cancel button in preview', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: '' }); // X button has no text
      expect(cancelButton).toBeInTheDocument();
    });

    it('should call resetInput when cancel clicked', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      // Find button with X icon (first button without text)
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn) => !btn.textContent?.trim());
      if (cancelButton) {
        fireEvent.click(cancelButton);
        expect(mockResetInput).toHaveBeenCalled();
      }
    });

    it('should show upload button in preview', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByRole('button', { name: /subir y aplicar/i })).toBeInTheDocument();
    });
  });

  describe('Upload Action', () => {
    it('should call uploadImage when upload button clicked', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      render(<FileUploadSection {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /subir y aplicar/i }));

      expect(mockUploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 'artist-123',
          imageType: 'profile',
          file: expect.any(File),
        }),
        expect.any(Object)
      );
    });

    it('should call onSuccess after successful upload and apply', () => {
      mockFileUploadState.selectedFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      mockFileUploadState.previewUrl = 'blob:test-preview-url';

      mockUploadImage.mockImplementation((_, options) => {
        options.onSuccess({ customImageId: 'custom-123' });
      });

      mockApplyImage.mockImplementation((_, options) => {
        options.onSuccess();
      });

      render(<FileUploadSection {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /subir y aplicar/i }));

      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display file error', () => {
      mockFileUploadState.error = 'File too large';

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText('File too large')).toBeInTheDocument();
    });
  });

  describe('Custom Images List', () => {
    it('should render custom images section when images exist', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText(/imágenes subidas/i)).toBeInTheDocument();
    });

    it('should display custom images count', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
        {
          id: 'img-2',
          fileName: 'custom2.jpg',
          fileSize: '2048',
          imageType: 'profile',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText(/imágenes subidas \(2\)/i)).toBeInTheDocument();
    });

    it('should display custom image file names', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'my-custom-image.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText('my-custom-image.jpg')).toBeInTheDocument();
    });

    it('should show active badge for active image', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: true,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText('Activa')).toBeInTheDocument();
    });

    it('should show apply button for inactive images', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Aplicar' })).toBeInTheDocument();
    });

    it('should not show apply button for active image', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: true,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.queryByRole('button', { name: 'Aplicar' })).not.toBeInTheDocument();
    });

    it('should call applyImage when apply clicked', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

      expect(mockApplyImage).toHaveBeenCalledWith(
        expect.objectContaining({
          artistId: 'artist-123',
          customImageId: 'img-1',
        }),
        expect.any(Object)
      );
    });

    it('should show delete button for custom images', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'custom1.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByTitle('Eliminar imagen')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading custom images', () => {
      mockState.isLoadingCustomImages = true;

      render(<FileUploadSection {...defaultProps} />);

      expect(screen.getByText(/cargando imágenes personalizadas/i)).toBeInTheDocument();
    });
  });

  describe('Image Type Filtering', () => {
    it('should only show images of matching type', () => {
      mockState.customImages = [
        {
          id: 'img-1',
          fileName: 'profile.jpg',
          fileSize: '1024',
          imageType: 'profile',
          isActive: false,
        },
        {
          id: 'img-2',
          fileName: 'background.jpg',
          fileSize: '2048',
          imageType: 'background',
          isActive: false,
        },
      ];

      render(<FileUploadSection {...defaultProps} imageType="profile" />);

      expect(screen.getByText('profile.jpg')).toBeInTheDocument();
      expect(screen.queryByText('background.jpg')).not.toBeInTheDocument();
    });
  });
});
