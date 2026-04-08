'use client';

import { useEffect, useRef } from 'react';
import {
  AlertCircleIcon,
  CloudUpload,
  File as FileIcon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  formatBytes,
  useFileUpload,
  type FileWithPreview,
} from '@/hooks/use-file-upload';
import { optimizeImage } from '@/lib/utils';

const getFileIcon = (file: FileWithPreview) => {
  const fileType = file.file.type;
  if (fileType.startsWith('image/') && file.preview) {
    return (
      <div className="aspect-square size-10 overflow-hidden rounded-md">
        <img src={file.preview} className="h-full w-full object-cover" alt="Dateivorschau" />
      </div>
    );
  }
  return (
    <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-full">
      <FileIcon className="size-5 opacity-60" />
    </div>
  );
};

/**
 * Minimaler Upload-Wrapper fuer den Self-Signup-Flow.
 *
 * Wir verwenden hier bewusst nicht den globalen Upload aus
 * `@/components/form/file-upload`, weil dieser auf persistente Uploads
 * waehrend der Formulareingabe ausgelegt ist und dafuer zusaetzliche
 * Infrastruktur wie `id`, `onUpload`, Remove-Callbacks und bestehende Dateien
 * erwartet.
 *
 * Im Self-Signup benoetigen wir nur lokale Dateiauswahl mit Vorschau und die
 * Uebergabe genau einer Datei an react-hook-form, ohne sofortigen Storage-Upload.
 * Diese Komponente kapselt deshalb nur die gemeinsame `useFileUpload`-Basis in
 * einer kleineren, flow-spezifischen API.
 */
export function FileUpload<TFieldName extends string>({
  maxSize,
  placeholder,
  // description,
  required,
  setValue,
  accept,
  name,
  disabled,
}: {
  maxSize: number;
  placeholder?: string;
  // description?: string;
  required?: boolean;
  disabled?: boolean;
  setValue: (
    name: TFieldName,
    value: File | undefined,
    options?: {
      shouldValidate?: boolean;
      shouldDirty?: boolean;
      shouldTouch?: boolean;
    }
  ) => void;
  accept?: string;
  name: TFieldName;
}) {
  const [
    { files, isDragging, errors },
    {
      addFiles,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: false,
    maxFiles: 1,
    maxSize,
    accept,
  });
  const skippedCompressionSignature = useRef<string | null>(null);

  useEffect(() => {
    const uploadedFile = files[0];
    setValue(
      name,
      uploadedFile?.file instanceof File ? uploadedFile.file : undefined,
      {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      }
    );
  }, [files, name, setValue]);

  useEffect(() => {
    const uploadedFile = files[0];
    if (!uploadedFile || !(uploadedFile.file instanceof File)) {
      return;
    }

    const currentFile = uploadedFile.file;
    const isCompressibleImage =
      currentFile.type.startsWith('image/') &&
      currentFile.type !== 'image/svg+xml' &&
      currentFile.type !== 'image/webp';
    const fileSignature = [
      currentFile.name,
      currentFile.size,
      currentFile.lastModified,
    ].join(':');

    if (skippedCompressionSignature.current === fileSignature) {
      skippedCompressionSignature.current = null;
      return;
    }

    if (!isCompressibleImage) {
      return;
    }

    let isCancelled = false;

    const compressImage = async () => {
      try {
        const optimizedFile = await optimizeImage(currentFile, {
          fileType: currentFile.type,
        });

        if (isCancelled) {
          return;
        }

        if (optimizedFile.size >= currentFile.size) {
          return;
        }

        skippedCompressionSignature.current = [
          optimizedFile.name,
          optimizedFile.size,
          optimizedFile.lastModified,
        ].join(':');
        clearFiles();
        addFiles([optimizedFile]);
      } catch {
        // Komprimierung ist best-effort und soll den Flow nicht blockieren.
      }
    };

    void compressImage();

    return () => {
      isCancelled = true;
    };
  }, [addFiles, clearFiles, files]);

  return (
    <div className="flex flex-col gap-2 pb-2">
      {/* Drop area */}
      <div
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
          aria-label="Dateien hochladen"
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
            Datei hier ablegen oder zum Auswaehlen klicken
          </p>
          <div className="text-muted-foreground/70 flex flex-wrap justify-center gap-1 text-xs">
            {placeholder}
          </div>
        </div>
      </div>

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
                onClick={() => {
                  void removeFile(file.id);
                }}
                aria-label="Datei entfernen"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
