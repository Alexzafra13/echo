import { useState, useRef, useCallback, useEffect, ChangeEvent } from 'react';

export interface FileUploadOptions {
  maxSize?: number; // en bytes, default 10MB
  allowedTypes?: string[]; // tipos MIME permitidos
  onError?: (message: string) => void;
}

export interface FileUploadState {
  selectedFile: File | null;
  previewUrl: string | null;
  error: string | null;
}

export interface FileUploadActions {
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  clearSelection: () => void;
  setError: (error: string | null) => void;
  resetInput: () => void;
}

export interface UseFileUploadReturn extends FileUploadState, FileUploadActions {
  fileInputRef: React.RefObject<HTMLInputElement>;
  isValid: boolean;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Selección y validación de archivos con preview
export function useFileUpload(options: FileUploadOptions = {}): UseFileUploadReturn {
  const {
    maxSize = DEFAULT_MAX_SIZE,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
    onError,
  } = options;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);

  useEffect(() => {
    return () => {
      if (readerRef.current && readerRef.current.readyState === FileReader.LOADING) {
        readerRef.current.abort();
      }
    };
  }, []);

  const handleFileSelect = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setError(null);

      if (!allowedTypes.includes(file.type)) {
        const errorMsg = 'Tipo de archivo no permitido. Use JPEG, PNG o WebP.';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        const errorMsg = `El archivo excede el tamaño máximo de ${maxSizeMB}MB.`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setSelectedFile(file);

      if (readerRef.current && readerRef.current.readyState === FileReader.LOADING) {
        readerRef.current.abort();
      }

      const reader = new FileReader();
      readerRef.current = reader;
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.onerror = () => {
        const errorMsg = 'Error al leer el archivo para la vista previa.';
        setError(errorMsg);
        onError?.(errorMsg);
      };
      reader.readAsDataURL(file);
    },
    [allowedTypes, maxSize, onError]
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  const resetInput = useCallback(() => {
    clearSelection();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [clearSelection]);

  return {
    selectedFile,
    previewUrl,
    error,
    isValid: selectedFile !== null && error === null,
    handleFileSelect,
    clearSelection,
    setError,
    resetInput,
    fileInputRef,
  };
}
