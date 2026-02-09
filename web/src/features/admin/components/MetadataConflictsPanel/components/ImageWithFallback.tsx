import { useState } from 'react';

interface ImageWithFallbackProps {
  src: string | undefined;
  alt: string;
  className: string;
  fallbackMessage: string;
}

/**
 * ImageWithFallback component - Safe image component that shows fallback on error
 * Avoids innerHTML to prevent XSS vulnerabilities
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  fallbackMessage,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className={className}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-tertiary)',
            fontSize: '0.875rem',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '1rem',
          }}
        >
          {fallbackMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <img src={src} alt={alt} onError={() => setHasError(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
}
