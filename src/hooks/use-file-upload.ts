'use client';

import type React from 'react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type InputHTMLAttributes,
} from 'react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
  url: string;
  id: string;
};

export type FileWithPreview = {
  file: File | FileMetadata;
  id: string;
  preview?: string;
};

export type FileUploadOptions = {
  maxFiles?: number; // Only used when multiple is true, defaults to Infinity
  maxSize?: number; // in bytes (optional - if not provided, no size restriction)
  accept?: string;
  multiple?: boolean; // Defaults to false
  initialFiles?: FileMetadata[];
  onFilesChange?: (files: FileWithPreview[]) => void; // Callback when files change
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void; // Callback when new files are added
};

export type FileUploadState = {
  files: FileWithPreview[];
  isDragging: boolean;
  errors: string[];
};

export type FileUploadActions = {
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => Promise<'success' | 'cancel'>;
  /** Removes file silently without prompting the user. Used eg. after image optimization */
  removeFileSilently: (id: string) => void;
  /** Clears all files after user confirmation. */
  clearFiles: () => Promise<'success' | 'cancel'>;
  /** Clears all files without prompting the user (internal use). */
  clearFilesSilently: () => void;
  clearErrors: () => void;
  handleDragEnter: (e: DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: DragEvent<HTMLElement>) => void;
  handleDragOver: (e: DragEvent<HTMLElement>) => void;
  handleDrop: (e: DragEvent<HTMLElement>) => void;
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  openFileDialog: () => void;
  getInputProps: (
    props?: InputHTMLAttributes<HTMLInputElement>
  ) => InputHTMLAttributes<HTMLInputElement> & {
    ref: React.Ref<HTMLInputElement>;
  };
};

export const useFileUpload = (
  options: FileUploadOptions = {}
): [FileUploadState, FileUploadActions] => {
  const {
    maxFiles = Infinity,
    maxSize = Infinity,
    accept = '*',
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
  } = options;

  const [state, setState] = useState<FileUploadState>({
    files: initialFiles.map((file) => ({
      file,
      id: file.id,
      preview: file.url,
    })),
    isDragging: false,
    errors: [],
  });

  const { showDestructive } = useConfirmDialog();

  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal files when initialFiles changes (e.g. after org data loads on settings page)
  const initialFilesKey = initialFiles
    .map((f) => `${f.id}:${f.url}`)
    .join('|');
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      files: initialFiles.map((file) => ({
        file,
        id: file.id,
        preview: file.url,
      })),
    }));
  }, [initialFilesKey]);

  const validateFile = useCallback(
    (file: File | FileMetadata): string | null => {
      // Only validate size if maxSize is provided and not Infinity
      if (maxSize !== Infinity && maxSize !== undefined) {
        if (file instanceof File) {
          if (file.size > maxSize) {
            return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
          }
        } else {
          if (file.size > maxSize) {
            return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
          }
        }
      }

      if (accept !== '*') {
        const acceptedTypes = accept.split(',').map((type) => type.trim());
        const fileType = file instanceof File ? file.type || '' : file.type;
        const fileExtension = `.${file instanceof File ? file.name.split('.').pop() : file.name.split('.').pop()}`;

        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return fileExtension.toLowerCase() === type.toLowerCase();
          }
          if (type.endsWith('/*')) {
            const baseType = type.split('/')[0];
            return fileType.startsWith(`${baseType}/`);
          }
          return fileType === type;
        });

        if (!isAccepted) {
          return `File "${file instanceof File ? file.name : file.name}" is not an accepted file type.`;
        }
      }

      return null;
    },
    [accept, maxSize]
  );

  const createPreview = useCallback(
    (file: File | FileMetadata): string | undefined => {
      if (file instanceof File) {
        return URL.createObjectURL(file);
      }
      return file.url;
    },
    []
  );

  const generateUniqueId = useCallback((file: File | FileMetadata): string => {
    if (file instanceof File) {
      return `${file.name}-${crypto.randomUUID()}`;
    }
    return file.id;
  }, []);

  const revokePreviewUrl = useCallback((file: FileWithPreview) => {
    if (file.preview && file.file instanceof File) {
      URL.revokeObjectURL(file.preview);
    }
  }, []);

  const clearFilesSilently = useCallback(() => {
    setState((prev) => {
      // Clean up object URLs
      prev.files.forEach((file) => {
        revokePreviewUrl(file);
      });

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      const newState = {
        ...prev,
        files: [],
        errors: [],
      };

      onFilesChange?.(newState.files);
      return newState;
    });
  }, [onFilesChange]);

  const clearFiles = useCallback(
    async (): Promise<'success' | 'cancel'> => {
      const result = await showDestructive(
        'Alle Dateien entfernen',
        'Möchten Sie wirklich alle Dateien entfernen?'
      );
      if (result !== 'success') return result;
      clearFilesSilently();
      return result;
    },
    [clearFilesSilently, showDestructive]
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      if (!newFiles || newFiles.length === 0) return;

      const newFilesArray = Array.from(newFiles);
      const errors: string[] = [];

      // Clear existing errors when new files are uploaded
      setState((prev) => ({ ...prev, errors: [] }));

      // Check if adding these files would exceed maxFiles (only in multiple mode)
      if (
        multiple &&
        maxFiles !== Infinity &&
        state.files.length + newFilesArray.length > maxFiles
      ) {
        errors.push(`You can only upload a maximum of ${maxFiles} files.`);
        setState((prev) => ({ ...prev, errors }));
        return;
      }

      const validFiles: FileWithPreview[] = [];

      newFilesArray.forEach((file) => {
        // Only check for duplicates if multiple files are allowed
        if (multiple) {
          const isDuplicate = state.files.some(
            (existingFile) =>
              existingFile.file.name === file.name &&
              existingFile.file.size === file.size
          );

          // Skip duplicate files silently
          if (isDuplicate) {
            return;
          }
        }

        // Check file size only if maxSize is provided and not Infinity
        if (
          maxSize !== Infinity &&
          maxSize !== undefined &&
          file.size > maxSize
        ) {
          errors.push(
            multiple
              ? `Some files exceed the maximum size of ${formatBytes(maxSize)}.`
              : `File exceeds the maximum size of ${formatBytes(maxSize)}.`
          );
          return;
        }

        const error = validateFile(file);
        if (error) {
          errors.push(error);
        } else {
          validFiles.push({
            file,
            id: generateUniqueId(file),
            preview: createPreview(file),
          });
        }
      });

      // Only update state if we have valid files to add
      if (validFiles.length > 0) {
        const filesToAdd = multiple ? validFiles : validFiles.slice(0, 1);

        // Call the onFilesAdded callback with the newly added valid files
        onFilesAdded?.(filesToAdd);

        setState((prev) => {
          if (!multiple) {
            prev.files.forEach((file) => {
              revokePreviewUrl(file);
            });
          }

          const newFiles = multiple
            ? [...prev.files, ...filesToAdd]
            : [...filesToAdd];
          onFilesChange?.(newFiles);
          return {
            ...prev,
            files: newFiles,
            errors,
          };
        });
      } else if (errors.length > 0) {
        setState((prev) => ({
          ...prev,
          errors,
        }));
      }

      // Reset input value after handling files
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [
      state.files,
      maxFiles,
      multiple,
      maxSize,
      validateFile,
      createPreview,
      generateUniqueId,
      revokePreviewUrl,
      onFilesChange,
      onFilesAdded,
    ]
  );

  const removeFileSilently = useCallback(
    (id: string) => {
      setState((prev) => {
        const fileToRemovePrev = prev.files.find((file) => file.id === id);
        if (fileToRemovePrev) {
          revokePreviewUrl(fileToRemovePrev);
        }

        const newFiles = prev.files.filter((file) => file.id !== id);
        onFilesChange?.(newFiles);

        return {
          ...prev,
          files: newFiles,
          errors: [],
        };
      });
    },
    [onFilesChange, revokePreviewUrl]
  );

  const removeFile = useCallback(
    async (id: string): Promise<'success' | 'cancel'> => {
      const fileToRemove = state.files.find((file) => file.id === id);
      const filename =
        fileToRemove?.file instanceof File
          ? fileToRemove.file.name
          : fileToRemove?.file?.name;

      const result = await showDestructive(
        'Datei entfernen',
        `Möchten Sie "${filename ?? 'diese Datei'}" wirklich entfernen?`
      );
      if (result !== 'success') return result;

      removeFileSilently(id);
      return result;
    },
    [removeFileSilently, showDestructive, state.files]
  );

  const clearErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errors: [],
    }));
  }, []);

  const handleDragEnter = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }

    setState((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setState((prev) => ({ ...prev, isDragging: false }));

      // Don't process files if the input is disabled
      if (inputRef.current?.disabled) {
        return;
      }

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        // In single file mode, only use the first file
        if (!multiple) {
          const file = e.dataTransfer.files[0];
          addFiles([file]);
        } else {
          addFiles(e.dataTransfer.files);
        }
      }
    },
    [addFiles, multiple]
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  const openFileDialog = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  }, []);

  const getInputProps = useCallback(
    (props: InputHTMLAttributes<HTMLInputElement> = {}) => {
      return {
        ...props,
        type: 'file' as const,
        onChange: handleFileChange,
        accept: props.accept || accept,
        multiple: props.multiple !== undefined ? props.multiple : multiple,
        ref: inputRef,
      };
    },
    [accept, multiple, handleFileChange]
  );

  return [
    state,
    {
      addFiles,
      removeFile,
      removeFileSilently,
      clearFiles,
      clearFilesSilently,
      clearErrors,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      handleFileChange,
      openFileDialog,
      getInputProps,
    },
  ];
};

// Helper function to format bytes to human-readable format
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
};
