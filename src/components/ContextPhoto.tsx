import { useState } from 'react';
import type { Photo } from '../lib/photos';

/**
 * A captioned context photograph: responsive WebP, lazy below the fold, fixed
 * aspect ratio (no layout shift), and a plain fallback if the file is missing.
 */
export default function ContextPhoto({ photo, className, eager = false }: { photo: Photo; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className={`ctx-photo${className ? ` ${className}` : ''}`}>
      <div className="ctx-photo-frame" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
        {failed ? (
          <p className="ctx-photo-missing">Hindi ma-load ang larawan. {photo.alt}</p>
        ) : (
          <img
            src={`${photo.base}-1280.webp`}
            srcSet={`${photo.base}-720.webp 720w, ${photo.base}-1280.webp 1280w`}
            sizes="(max-width: 860px) 100vw, 560px"
            width={photo.width}
            height={photo.height}
            alt={photo.alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <figcaption>
        {photo.caption}{' '}
        <span className="ctx-photo-credit">
          Larawan: <a href={photo.sourceUrl} target="_blank" rel="noopener">{photo.credit}</a>,{' '}
          <a href={photo.licenseUrl} target="_blank" rel="noopener">{photo.license}</a>
        </span>
      </figcaption>
    </figure>
  );
}
