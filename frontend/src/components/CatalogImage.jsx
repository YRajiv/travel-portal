import { useState } from 'react';
import { MapPin } from 'lucide-react';

export default function CatalogImage({ src, alt, className = '', fallbackClassName = '' }) {
  const [failedSource, setFailedSource] = useState('');
  const failed = failedSource === src;

  if (!src || failed) {
    return (
      <div className={`catalog-image-fallback ${fallbackClassName || className}`} role="img" aria-label={alt}>
        <MapPin size={28} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailedSource(src)}
      src={src}
    />
  );
}
