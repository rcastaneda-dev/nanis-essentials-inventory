import { ItemImage } from '../types/models';
import { uid, nowIso } from './utils';

// Image configuration
export const IMAGE_CONFIG = {
  maxFileSize: 2 * 1024 * 1024, // 2MB
  maxImagesPerItem: 5,
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  thumbnailSize: 80,
  mediumSize: 200,
  compressionQuality: 0.8,
};

// Validate image file
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please use JPEG, PNG, or WebP.' };
  }

  if (file.size > IMAGE_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File size too large. Maximum size is ${IMAGE_CONFIG.maxFileSize / (1024 * 1024)}MB.`,
    };
  }

  return { valid: true };
}

// Convert file to base64 with compression
export function compressImage(
  file: File,
  quality: number = IMAGE_CONFIG.compressionQuality
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions to keep aspect ratio
      const maxDimension = 800;
      let { width, height } = img;

      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL(file.type, quality);
      resolve(compressedDataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = () => URL.revokeObjectURL(objectUrl); // Clean up memory
  });
}

// Generate thumbnail from base64 image
export function generateThumbnail(
  dataUrl: string,
  size: number = IMAGE_CONFIG.thumbnailSize
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = size;
      canvas.height = size;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate crop dimensions for square thumbnail
      const { width, height } = img;
      const minDim = Math.min(width, height);
      const x = (width - minDim) / 2;
      const y = (height - minDim) / 2;

      ctx.drawImage(img, x, y, minDim, minDim, 0, 0, size, size);
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      resolve(thumbnailDataUrl);
    };

    img.onerror = () => reject(new Error('Failed to generate thumbnail'));
    img.src = dataUrl;
  });
}

// Process file into ItemImage
export async function processImageFile(file: File): Promise<ItemImage> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const compressedDataUrl = await compressImage(file);
  const thumbnailUrl = await generateThumbnail(compressedDataUrl);

  return {
    id: uid(),
    name: file.name,
    dataUrl: compressedDataUrl,
    thumbnailUrl,
    size: compressedDataUrl.length,
    type: file.type,
    uploadedAt: nowIso(),
    isPrimary: false,
  };
}

// Get primary image from item
export function getPrimaryImage(images: ItemImage[], primaryImageId?: string): ItemImage | null {
  if (!images.length) return null;

  if (primaryImageId) {
    const primary = images.find(img => img.id === primaryImageId);
    if (primary) return primary;
  }

  // Fallback to first image marked as primary, or just first image
  return images.find(img => img.isPrimary) || images[0];
}

// Calculate total storage size for images
export function calculateImageStorageSize(images: ItemImage[]): number {
  return images.reduce((total, img) => total + img.size, 0);
}

// Get placeholder image based on category
export function getCategoryPlaceholder(category: string): string {
  const placeholders: Record<string, string> = {
    'Body Care': '🧴',
    'Hair Care': '💇‍♀️',
    Makeup: '💄',
    Fragrance: '🌸',
    'Skin Care': '✨',
    Other: '🛍️',
  };

  return placeholders[category] || placeholders['Other'];
}

// Generate data URL for emoji placeholder
export function generateEmojiPlaceholder(emoji: string, size: number = 120): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  canvas.width = size;
  canvas.height = size;

  // Background
  ctx.fillStyle = '#f3f4f6';
  ctx.fillRect(0, 0, size, size);

  // Emoji
  ctx.font = `${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);

  return canvas.toDataURL('image/png');
}
