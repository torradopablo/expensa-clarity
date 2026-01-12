import { useState, useCallback } from "react";

export interface FileUploadState {
  file: File | null;
  preview: string | null;
  loading: boolean;
  error: string | null;
  progress: number;
}

export interface FileUploadActions {
  selectFile: (file: File) => void;
  clearFile: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export function useFileUpload(accept?: string, maxSize?: number): FileUploadState & FileUploadActions {
  const [state, setState] = useState<FileUploadState>({
    file: null,
    preview: null,
    loading: false,
    error: null,
    progress: 0,
  });

  const selectFile = useCallback((file: File) => {
    // Validate file type
    if (accept && !file.type.match(accept.replace(/\*/g, ".*"))) {
      setState(prev => ({
        ...prev,
        error: `Tipo de archivo no válido. Se acepta: ${accept}`,
        file: null,
        preview: null,
      }));
      return;
    }

    // Validate file size
    if (maxSize && file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      setState(prev => ({
        ...prev,
        error: `El archivo es demasiado grande. Máximo: ${maxSizeMB.toFixed(1)}MB`,
        file: null,
        preview: null,
      }));
      return;
    }

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setState(prev => ({
          ...prev,
          file,
          preview: e.target?.result as string,
          error: null,
        }));
      };
      reader.readAsDataURL(file);
    } else {
      // For PDFs and other files, just store the file
      setState(prev => ({
        ...prev,
        file,
        preview: null,
        error: null,
      }));
    }
  }, [accept, maxSize]);

  const clearFile = useCallback(() => {
    setState({
      file: null,
      preview: null,
      loading: false,
      error: null,
      progress: 0,
    });
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({
      file: null,
      preview: null,
      loading: false,
      error: null,
      progress: 0,
    });
  }, []);

  return {
    ...state,
    selectFile,
    clearFile,
    setError,
    reset,
  };
}
