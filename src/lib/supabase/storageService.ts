import { supabase } from './client';
import { ItemImage } from '../../types/models';
import { uid } from '../utils';

const BUCKET = 'products';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export function isBase64Image(dataUrl: string): boolean {
  return dataUrl.startsWith('data:');
}

export function base64ToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    buffer[i] = bytes.charCodeAt(i);
  }
  return new Blob([buffer], { type: mime });
}

/**
 * Uploads new (base64) images to Supabase Storage and returns all images
 * with public URLs. Existing URL-based images pass through unchanged.
 */
export async function uploadProductImages(
  productId: string,
  images: ItemImage[]
): Promise<ItemImage[]> {
  const results: ItemImage[] = [];

  for (const image of images) {
    if (!isBase64Image(image.dataUrl)) {
      results.push(image);
      continue;
    }

    const blob = base64ToBlob(image.dataUrl);
    const ext = MIME_TO_EXT[blob.type] ?? 'jpg';
    const filePath = `${productId}/${uid()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, blob, {
      contentType: blob.type,
      upsert: false,
    });

    if (error) {
      throw new Error(`Failed to upload image "${image.name}": ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

    results.push({
      ...image,
      id: publicUrl,
      dataUrl: publicUrl,
      thumbnailUrl: undefined,
      size: blob.size,
    });
  }

  return results;
}
