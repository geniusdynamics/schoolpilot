// ABOUTME: Client-side image upload helper — size/type-guarded File → base64 data URL,
// ABOUTME: persisted as a document string field via the provider-agnostic collection API.
// ABOUTME: (The ICollection contract has no binary attachment API, so images are stored
// ABOUTME as data URLs; the 2 MB guard keeps documents well within provider limits.)

import { logger } from '@/utils/logging';

/** Hard ceiling for uploaded images (2 MB uncompressed). */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export class ImageUploadError extends Error {}

/**
 * Validate and read an image File as a base64 data URL.
 * Throws ImageUploadError with a user-presentable message on rejection.
 */
export function fileToImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      reject(new ImageUploadError('Please choose a JPEG, PNG, WebP or GIF image.'));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new ImageUploadError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 2 MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => {
      logger.error('[imageUpload] Failed to read file:', reader.error);
      reject(new ImageUploadError('Could not read the selected file.'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Persist an image onto an existing document as a data-URL string field.
 *
 * @example
 * const dataUrl = await fileToImageDataUrl(file);
 * await updateStudent(studentId, { photo_path: dataUrl });
 */
export async function readImageForField(file: File): Promise<string> {
  return fileToImageDataUrl(file);
}
