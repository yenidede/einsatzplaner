import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import imageCompression from 'browser-image-compression';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const defaultOptions = {
  maxSizeMB: 0.8, // 800 KB
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/webp',
};
export async function optimizeImage(
  file: File,
  options?: Partial<typeof defaultOptions>
): Promise<File> {
  const mergedOptions = { ...defaultOptions, ...options };
  return await imageCompression(file, mergedOptions);
}
