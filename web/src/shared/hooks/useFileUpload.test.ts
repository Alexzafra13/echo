import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from './useFileUpload';
import { ChangeEvent } from 'react';

// Mock FileReader
const mockFileReaderResult = 'data:image/jpeg;base64,mockdata';
class MockFileReader {
  static readonly LOADING = 1;
  static readonly DONE = 2;

  result: string | null = null;
  readyState: number = 0;
  onloadend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL() {
    this.readyState = MockFileReader.LOADING;
    this.result = mockFileReaderResult;
    setTimeout(() => {
      this.readyState = MockFileReader.DONE;
      this.onloadend?.();
    }, 0);
  }

  abort() {
    this.readyState = MockFileReader.DONE;
  }
}

// Replace global FileReader
vi.stubGlobal('FileReader', MockFileReader);

// Helper to create mock file
function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type });
}

// Helper to create mock change event
function createMockChangeEvent(file: File | null): ChangeEvent<HTMLInputElement> {
  return {
    target: {
      files: file ? [file] : null,
    },
  } as unknown as ChangeEvent<HTMLInputElement>;
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state with no file selected', () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.previewUrl).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isValid).toBe(false);
    });

    it('should provide all required functions', () => {
      const { result } = renderHook(() => useFileUpload());

      expect(typeof result.current.handleFileSelect).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
      expect(typeof result.current.setError).toBe('function');
      expect(typeof result.current.resetInput).toBe('function');
    });

    it('should provide a ref for file input', () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.fileInputRef).toBeDefined();
      expect(result.current.fileInputRef.current).toBeNull();
    });
  });

  describe('file selection', () => {
    it('should accept valid JPEG file', async () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBe(file);
      expect(result.current.error).toBeNull();
      expect(result.current.isValid).toBe(true);

      // Wait for FileReader to complete
      await vi.waitFor(() => {
        expect(result.current.previewUrl).toBe(mockFileReaderResult);
      });
    });

    it('should accept valid PNG file', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.png', 1024, 'image/png');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBe(file);
      expect(result.current.error).toBeNull();
    });

    it('should accept valid WebP file', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.webp', 1024, 'image/webp');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBe(file);
      expect(result.current.error).toBeNull();
    });

    it('should do nothing when no file is selected', () => {
      const { result } = renderHook(() => useFileUpload());
      const event = createMockChangeEvent(null);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('file type validation', () => {
    it('should reject file with invalid type', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBe('Tipo de archivo no permitido. Use JPEG, PNG o WebP.');
      expect(result.current.isValid).toBe(false);
    });

    it('should reject GIF files by default', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.gif', 1024, 'image/gif');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toContain('Tipo de archivo no permitido');
    });

    it('should accept custom allowed types', () => {
      const { result } = renderHook(() =>
        useFileUpload({ allowedTypes: ['image/gif', 'image/svg+xml'] })
      );
      const file = createMockFile('test.gif', 1024, 'image/gif');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBe(file);
      expect(result.current.error).toBeNull();
    });
  });

  describe('file size validation', () => {
    it('should reject file exceeding default max size (10MB)', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('large.jpg', 11 * 1024 * 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBe('El archivo excede el tamaño máximo de 10MB.');
      expect(result.current.isValid).toBe(false);
    });

    it('should accept file at exactly max size', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('exact.jpg', 10 * 1024 * 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBe(file);
      expect(result.current.error).toBeNull();
    });

    it('should respect custom max size', () => {
      const { result } = renderHook(() =>
        useFileUpload({ maxSize: 5 * 1024 * 1024 }) // 5MB
      );
      const file = createMockFile('medium.jpg', 6 * 1024 * 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.error).toBe('El archivo excede el tamaño máximo de 5MB.');
    });
  });

  describe('onError callback', () => {
    it('should call onError when file type is invalid', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useFileUpload({ onError }));
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(onError).toHaveBeenCalledWith('Tipo de archivo no permitido. Use JPEG, PNG o WebP.');
    });

    it('should call onError when file size exceeds limit', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useFileUpload({ onError }));
      const file = createMockFile('large.jpg', 11 * 1024 * 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(onError).toHaveBeenCalledWith('El archivo excede el tamaño máximo de 10MB.');
    });

    it('should not call onError when file is valid', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useFileUpload({ onError }));
      const file = createMockFile('valid.jpg', 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('clearSelection', () => {
    it('should clear all state', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      // First select a file
      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.selectedFile).toBe(file);

      // Then clear selection
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.previewUrl).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isValid).toBe(false);
    });

    it('should clear error state', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const event = createMockChangeEvent(file);

      // First trigger an error
      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.error).not.toBeNull();

      // Then clear
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('setError', () => {
    it('should allow setting custom error', () => {
      const { result } = renderHook(() => useFileUpload());

      act(() => {
        result.current.setError('Custom error message');
      });

      expect(result.current.error).toBe('Custom error message');
      expect(result.current.isValid).toBe(false);
    });

    it('should allow clearing error', () => {
      const { result } = renderHook(() => useFileUpload());

      act(() => {
        result.current.setError('Some error');
      });

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('resetInput', () => {
    it('should clear selection and reset input ref', () => {
      const { result } = renderHook(() => useFileUpload());

      // Mock the input ref
      const mockInput = { value: 'some-file.jpg' } as HTMLInputElement;
      (result.current.fileInputRef as { current: HTMLInputElement | null }).current = mockInput;

      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      // Select a file
      act(() => {
        result.current.handleFileSelect(event);
      });

      // Reset
      act(() => {
        result.current.resetInput();
      });

      expect(result.current.selectedFile).toBeNull();
      expect(result.current.previewUrl).toBeNull();
      expect(result.current.error).toBeNull();
      expect(mockInput.value).toBe('');
    });
  });

  describe('isValid computed property', () => {
    it('should be false when no file is selected', () => {
      const { result } = renderHook(() => useFileUpload());

      expect(result.current.isValid).toBe(false);
    });

    it('should be true when valid file is selected', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.isValid).toBe(true);
    });

    it('should be false when there is an error', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      expect(result.current.isValid).toBe(false);
    });

    it('should be false when file selected but error set manually', () => {
      const { result } = renderHook(() => useFileUpload());
      const file = createMockFile('test.jpg', 1024, 'image/jpeg');
      const event = createMockChangeEvent(file);

      act(() => {
        result.current.handleFileSelect(event);
      });

      act(() => {
        result.current.setError('Upload failed');
      });

      expect(result.current.isValid).toBe(false);
    });
  });

  describe('clearing error on new selection', () => {
    it('should clear previous error when selecting new file', () => {
      const { result } = renderHook(() => useFileUpload());

      // First, trigger an error
      const invalidFile = createMockFile('test.pdf', 1024, 'application/pdf');
      act(() => {
        result.current.handleFileSelect(createMockChangeEvent(invalidFile));
      });

      expect(result.current.error).not.toBeNull();

      // Then select a valid file
      const validFile = createMockFile('test.jpg', 1024, 'image/jpeg');
      act(() => {
        result.current.handleFileSelect(createMockChangeEvent(validFile));
      });

      expect(result.current.error).toBeNull();
      expect(result.current.selectedFile).toBe(validFile);
    });
  });
});
