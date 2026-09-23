import type { ImageMetadata } from 'astro';
import type { ImagePath } from './types';

/**
 * Every image under src/assets/media/, imported at build time. Importing is
 * what lets astro:assets resize them and read their real dimensions; the data
 * files only name them ("el-break/antes.webp").
 */
const files = import.meta.glob<ImageMetadata>('/src/assets/media/**/*.{avif,jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
});

const PREFIX = '/src/assets/media/';
const byPath = new Map(Object.entries(files).map(([path, meta]) => [path.slice(PREFIX.length), meta]));

/** The image for a data path, or undefined if the file has not been added yet. */
export function resolveImage(src: ImagePath): ImageMetadata | undefined {
  return byPath.get(src);
}
