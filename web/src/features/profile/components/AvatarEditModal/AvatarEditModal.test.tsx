import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarEditModal } from './AvatarEditModal';
import * as useAuthModule from '@shared/hooks/useAuth';
import * as authStoreModule from '@shared/store/authStore';
import * as avatarHooksModule from '../../hooks';

// Mock the hooks
vi.mock('@shared/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@shared/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../../hooks', () => ({
  useUploadAvatar: vi.fn(),
  useDeleteAvatar: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  name: 'Test User',
  hasAvatar: false,
};

const mockUserWithAvatar = {
  ...mockUser,
  hasAvatar: true,
};

const mockOnClose = vi.fn();
const mockUpdateUser = vi.fn();
const mockUpdateAvatarTimestamp = vi.fn();

describe('AvatarEditModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: mockUser,
    } as ReturnType<typeof useAuthModule.useAuth>);

    vi.mocked(authStoreModule.useAuthStore).mockImplementation((selector) => {
      const state = {
        avatarTimestamp: Date.now(),
        updateAvatarTimestamp: mockUpdateAvatarTimestamp,
        updateUser: mockUpdateUser,
      };
      return selector(state as unknown as Parameters<typeof selector>[0]);
    });

    vi.mocked(avatarHooksModule.useUploadAvatar).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof avatarHooksModule.useUploadAvatar>);

    vi.mocked(avatarHooksModule.useDeleteAvatar).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof avatarHooksModule.useDeleteAvatar>);
  });

  describe('rendering', () => {
    it('should render modal with title', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);
      expect(screen.getByText('Foto de perfil')).toBeInTheDocument();
    });

    it('should show initials when user has no avatar', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);
      expect(screen.getByText('TU')).toBeInTheDocument(); // Test User initials
    });

    it('should show upload button', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);
      expect(screen.getByText('Subir nueva foto')).toBeInTheDocument();
    });

    it('should not show delete button when user has no avatar', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);
      expect(screen.queryByText('Eliminar foto')).not.toBeInTheDocument();
    });

    it('should show delete button when user has avatar', () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUserWithAvatar,
      } as ReturnType<typeof useAuthModule.useAuth>);

      render(<AvatarEditModal onClose={mockOnClose} />);
      expect(screen.getByText('Eliminar foto')).toBeInTheDocument();
    });

    it('should show format info', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);
      expect(screen.getByText(/Formatos permitidos/)).toBeInTheDocument();
      expect(screen.getByText(/Tamaño máximo: 5MB/)).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('should call onClose when close button clicked', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      const closeButton = screen.getByRole('button', { name: '' }); // X icon button
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      // The modal overlay
      const modal = document.querySelector('[class*="modal"]');
      if (modal) {
        fireEvent.click(modal);
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('file selection', () => {
    it('should show error for invalid file type', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' });

      fireEvent.change(input, { target: { files: [invalidFile] } });

      // Uses useFileUpload hook error message
      expect(
        screen.getByText('Tipo de archivo no permitido. Use JPEG, PNG o WebP.')
      ).toBeInTheDocument();
    });

    it('should show error for file too large', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      // Create a file larger than 5MB
      const largeContent = new Array(6 * 1024 * 1024).fill('a').join('');
      const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });

      fireEvent.change(input, { target: { files: [largeFile] } });

      // Uses useFileUpload hook error message
      expect(screen.getByText('El archivo excede el tamaño máximo de 5MB.')).toBeInTheDocument();
    });

    it('should show preview and save button for valid file', async () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        abort: vi.fn(),
        result: 'data:image/jpeg;base64,test',
        readyState: 0,
        onloadend: null as (() => void) | null,
      };
      vi.spyOn(global, 'FileReader').mockImplementation(
        () => mockFileReader as unknown as FileReader
      );

      fireEvent.change(input, { target: { files: [validFile] } });

      // Trigger the onloadend callback
      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      await waitFor(() => {
        expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });
    });

    it('should cancel file selection', async () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      const mockFileReader = {
        readAsDataURL: vi.fn(),
        abort: vi.fn(),
        result: 'data:image/jpeg;base64,test',
        readyState: 0,
        onloadend: null as (() => void) | null,
      };
      vi.spyOn(global, 'FileReader').mockImplementation(
        () => mockFileReader as unknown as FileReader
      );

      fireEvent.change(input, { target: { files: [validFile] } });

      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(screen.getByText('Subir nueva foto')).toBeInTheDocument();
      });
    });
  });

  describe('upload', () => {
    it('should call upload mutation with file', async () => {
      const mockMutate = vi.fn();
      vi.mocked(avatarHooksModule.useUploadAvatar).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof avatarHooksModule.useUploadAvatar>);

      render(<AvatarEditModal onClose={mockOnClose} />);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

      const mockFileReader = {
        readAsDataURL: vi.fn(),
        abort: vi.fn(),
        result: 'data:image/jpeg;base64,test',
        readyState: 0,
        onloadend: null as (() => void) | null,
      };
      vi.spyOn(global, 'FileReader').mockImplementation(
        () => mockFileReader as unknown as FileReader
      );

      fireEvent.change(input, { target: { files: [validFile] } });

      if (mockFileReader.onloadend) {
        mockFileReader.onloadend();
      }

      await waitFor(() => {
        expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Guardar cambios'));

      expect(mockMutate).toHaveBeenCalledWith(validFile, expect.any(Object));
    });

    it('should show loading state while uploading', () => {
      vi.mocked(avatarHooksModule.useUploadAvatar).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as unknown as ReturnType<typeof avatarHooksModule.useUploadAvatar>);

      render(<AvatarEditModal onClose={mockOnClose} />);

      expect(screen.getByText('Subir nueva foto')).toBeDisabled();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUserWithAvatar,
      } as ReturnType<typeof useAuthModule.useAuth>);
    });

    it('should show delete confirmation when delete clicked', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Eliminar foto'));

      expect(screen.getByText('¿Eliminar foto de perfil?')).toBeInTheDocument();
      expect(screen.getByText('Esta acción no se puede deshacer')).toBeInTheDocument();
    });

    it('should cancel delete confirmation', () => {
      render(<AvatarEditModal onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Eliminar foto'));
      expect(screen.getByText('¿Eliminar foto de perfil?')).toBeInTheDocument();

      // Click cancel in confirmation dialog
      const cancelButtons = screen.getAllByText('Cancelar');
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText('¿Eliminar foto de perfil?')).not.toBeInTheDocument();
    });

    it('should call delete mutation when confirmed', () => {
      const mockMutate = vi.fn();
      vi.mocked(avatarHooksModule.useDeleteAvatar).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as unknown as ReturnType<typeof avatarHooksModule.useDeleteAvatar>);

      render(<AvatarEditModal onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('Eliminar foto'));
      fireEvent.click(screen.getByText('Eliminar'));

      expect(mockMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
    });

    it('should show loading state while deleting', () => {
      vi.mocked(avatarHooksModule.useDeleteAvatar).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as unknown as ReturnType<typeof avatarHooksModule.useDeleteAvatar>);

      render(<AvatarEditModal onClose={mockOnClose} />);

      expect(screen.getByText('Eliminar foto')).toBeDisabled();
    });
  });
});
