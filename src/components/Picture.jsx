import { fallbackWidth, imageMeta, imageUrl, srcSet } from '../images'

export { imageMeta, imageUrl } from '../images'

/**
 * Responsive image: AVIF and WebP sources at every generated width, the intrinsic width/height
 * (so the browser reserves space — no layout shift) and lazy loading unless `priority` is set.
 * <picture> uses display: contents (base.css), so CSS that targets the <img> keeps working.
 */
/**
 * @param {{ image: string, alt: string, sizes?: string, priority?: boolean, className?: string, imgRef?: import('react').Ref<HTMLImageElement>,
 *   [attr: string]: any }} props
 */
export default function Picture({ image, alt, sizes = '100vw', priority = false, className = undefined, imgRef = undefined, ...rest }) {
  const meta = imageMeta(image)
  return <picture>
    <source type="image/avif" srcSet={srcSet(image, 'avif')} sizes={sizes}/>
    <source type="image/webp" srcSet={srcSet(image, 'webp')} sizes={sizes}/>
    <img ref={imgRef} src={imageUrl(image, fallbackWidth(image))} width={meta.w} height={meta.h} alt={alt} className={className}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} decoding={priority ? 'sync' : 'async'} {...rest}/>
  </picture>
}
