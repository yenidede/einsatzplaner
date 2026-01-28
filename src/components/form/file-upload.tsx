'use client';

import { useRef } from 'react';
import { AlertCircleIcon, XIcon, CloudUpload, File } from 'lucide-react';
import {
  FileMetadata,
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from '@/hooks/use-file-upload';
import { Button } from '@/components/ui/button';
import { optimizeImage } from '@/lib/utils';
import { toast } from 'sonner';

const getFileIcon = (file: FileWithPreview) => {
  // Use preview if available (works for both File and FileMetadata)
  if (file.preview) {
    const fileType =
      file.file instanceof File ? file.file.type : file.file.type;
    if (fileType.startsWith('image/')) {
      return (
        <div className="aspect-square size-10 overflow-hidden rounded-md">
          <img
            src={file.preview}
            className="h-full w-full object-cover"
            alt={file.file instanceof File ? file.file.name : file.file.name}
          />
        </div>
      );
    }
  } else if (file.file instanceof File) {
    // New File - create object URL
    const fileType = file.file.type;
    if (fileType.startsWith('image/')) {
      const imageSrc = URL.createObjectURL(file.file);
      return (
        <div className="aspect-square size-10 overflow-hidden rounded-md">
          <img
            src={imageSrc}
            className="h-full w-full object-cover"
            alt={file.file.name}
          />
        </div>
      );
    }
  } else {
    // FileMetadata - use url directly
    const metadata = file.file;
    const fileType = metadata.type;
    if (fileType.startsWith('image/')) {
      return (
        <div className="aspect-square size-10 overflow-hidden rounded-md">
          <img
            src={metadata.url}
            className="h-full w-full object-cover"
            alt={metadata.name}
          />
        </div>
      );
    }
  }
  return (
    <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full">
      <File className="size-5 opacity-60" />
    </div>
  );
};

export function FileUpload({
  maxFiles,
  maxSize,
  placeholder,
  // description,
  required,
  setValue,
  accept,
  name,
  disabled,
  id,
  onUpload,
  onFileRemove,
  initialFiles,
}: {
  maxFiles: number;
  maxSize: number;
  placeholder?: string;
  // description?: string;
  required?: boolean;
  disabled?: boolean;
  setValue: (
    name: string,
    value: any,
    options?: {
      shouldValidate?: boolean;
      shouldDirty?: boolean;
      shouldTouch?: boolean;
    }
  ) => void;
  accept?: string;
  name: string;
  id: string;
  onUpload: (optimizedFile: File) => Promise<string>;
  onFileRemove?: (id: string) => void | Promise<void>;
  initialFiles?: FileMetadata[];
}) {
  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: maxFiles > 1,
    maxFiles,
    maxSize,
    accept,
    initialFiles,
    onFilesChange: (files) => {
      queueMicrotask(() => {
        optimizeFilesAndUpload(files, maxSize).then((optimizedFiles) => {
          setValue(name, optimizedFiles, {
            shouldValidate: true,
            shouldDirty: true,
            shouldTouch: true,
          });
        });
      });
    },
  });

  const lastUploadKeyRef = useRef<string | null>(null);
  const lastUploadValueRef = useRef<string | null>(null);

  return (
    <div className="flex flex-col gap-2 pb-2">
      {/* Drop Zone */}
      {files.length < maxFiles && (
        <div
          id={id}
          role="button"
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed p-4 transition-colors hover:cursor-pointer has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:ring-[3px]"
        >
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload files"
            required={required}
            disabled={disabled}
          />

          <div className="flex flex-col items-center justify-center text-center">
            <div
              className="bg-secondary mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
              aria-hidden="true"
            >
              <CloudUpload className="size-4 opacity-60" />
            </div>
            {/* <p className="mb-1.5 text-sm font-medium">
            Upload
          </p> */}
            <p className="text-foreground mb-2 text-sm font-medium">
              Datei{maxFiles > 1 ? 'en' : ''} hierher ziehen oder auswählen{' '}
            </p>
            <div className="text-muted-foreground/70 flex flex-wrap justify-center gap-1 text-xs">
              {placeholder}
            </div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-lg border p-2 pe-3"
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                {getFileIcon(file)}
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="max-w-[200px] truncate text-[11px] font-medium">
                    {file.file.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatBytes(file.file.size)}
                  </p>
                </div>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
                onClick={async () => {
                  removeFile(file.id);
                  // Check if it's a FileMetadata (existing file) or new File
                  if (!(file.file instanceof File)) {
                    // Existing file - call onFileRemove callback with file id
                    await onFileRemove?.(file.id);
                  }
                }}
                aria-label="Remove file"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}

          {/* Remove all files button */}
          {files.length > 1 && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={clearFiles}>
                Alle Dateien entfernen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  function isFileMetadata(value: unknown): value is FileMetadata {
    return (
      typeof File !== 'undefined' && Object.hasOwn(value as object, 'path')
    );
  }

  function getFileUniqueKey(file: File | FileMetadata) {
    if (isFileMetadata(file)) {
      return `metadata:${file.url}`;
    }
    return `file:${file.name}-${file.size}-${file.lastModified ?? 0}`;
  }

  async function optimizeFilesAndUpload(
    files: FileWithPreview[],
    maxSize: number
  ): Promise<string[]> {
    return Promise.all(
      files.map((file) => optimizeAndUploadIfImage(file.file, maxSize))
    );
  }

  async function optimizeAndUploadIfImage(
    file: File | FileMetadata,
    maxSize: number
  ): Promise<string> {
    const fileKey = getFileUniqueKey(file);
    if (isFileMetadata(file)) {
      lastUploadKeyRef.current = fileKey;
      lastUploadValueRef.current = file.url;
      return file.url;
    }

    if (fileKey === lastUploadKeyRef.current && lastUploadValueRef.current) {
      return lastUploadValueRef.current;
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are supported for upload.');
    }

    const targetSizeMB = Math.max(
      0.25,
      Math.min(2, maxSize / 1024 / 1024, file.size / 1024 / 1024)
    );

    try {
      console.log(
        'before optimize:',
        file.size / 1024 / 1024,
        'targetSizeMB:',
        targetSizeMB
      );
      const optimized = await optimizeImage(file);
      const fileToUpload = optimized.size < file.size ? optimized : file;

      if (fileToUpload.size / 1024 / 1024 <= targetSizeMB) {
        const uploadedPath = await onUpload(fileToUpload);
        lastUploadKeyRef.current = fileKey;
        lastUploadValueRef.current = uploadedPath;
        return uploadedPath;
      } else {
        toast.info(
          `Die Datei ist noch immer zu groß. Bitte erneut versuchen. ${
            fileToUpload.size / 1024 / 1024
          } MB, Ziel: ${targetSizeMB} MB`
        );
        throw new Error(
          'Optimized image not smaller than original or exceeds target size'
        );
      }
    } catch (error: unknown) {
      toast.error(`Image optimization failed ${error}`, {
        id: 'file-upload-optimize-error',
      });
      throw error;
    }
  }
}
