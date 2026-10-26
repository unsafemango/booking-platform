import { useState } from 'react';

/** Product photo that swaps to a plain placeholder when the image URL is broken, so cards keep their shape. */
export default function ProductImage({ src, lazy = false }: { src: string; lazy?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return <div className="product-image-fallback" aria-hidden="true" />;
  }
  return (
    <img src={src} alt="" loading={lazy ? 'lazy' : undefined} onError={() => setFailedSrc(src)} />
  );
}
