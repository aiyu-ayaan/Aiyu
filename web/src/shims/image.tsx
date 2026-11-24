// `next/image` for the Vite app: a plain <img> with the original file (Next's optimizer is not part of this app).
// shortcut: no resizing or format conversion; serve pre-sized images or add a Rust resizer if transfer size matters.
import { forwardRef, type CSSProperties, type ImgHTMLAttributes } from 'react';

type Src = string | { src: string; width?: number; height?: number };

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'loading'> & {
  src: Src;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  loading?: 'eager' | 'lazy';
  quality?: number | string;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  loader?: unknown;
  overrideSrc?: string;
};

const FILL: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

const Image = forwardRef<HTMLImageElement, Props>(function Image(
  { src, fill, priority, loading, quality: _q, unoptimized: _u, placeholder: _p, blurDataURL: _b, loader: _l, overrideSrc, sizes, style, width, height, ...rest },
  ref,
) {
  const url = overrideSrc || (typeof src === 'string' ? src : src.src);
  return (
    <img
      ref={ref}
      src={url}
      // `sizes` only matters with a srcset, which this shim never emits.
      data-sizes={sizes}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      loading={priority ? 'eager' : (loading ?? 'lazy')}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      style={fill ? { ...FILL, ...style } : style}
      {...rest}
    />
  );
});

export default Image;
