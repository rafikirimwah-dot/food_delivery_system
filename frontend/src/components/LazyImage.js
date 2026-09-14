// frontend/src/components/LazyImage.js
import React, { useState, useRef, useEffect } from 'react';
import './LazyImage.css';

function LazyImage({
  src, alt = '', className = '', wrapperClass = '',
  aspectRatio = '16/9', width, height, onError
}) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [error, setError] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const placeholder = (url) => {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/w_20,e_blur:400,q_10,f_auto/');
    }
    if (url.includes('images.unsplash.com')) {
      return url.replace(/w=\d+/, 'w=20').replace(/q=\d+/, 'q=10');
    }
    return url;
  };

  const handleError = (e) => {
    setError(true);
    onError?.(e);
  };

  return (
    <div
      ref={ref}
      className={`lazy-img-wrap ${wrapperClass}`}
      style={{ aspectRatio, width, height }}
    >
      {!loaded && !error && (
        <div
          className="lazy-img-placeholder"
          style={{
            backgroundImage: `url(${placeholder(src)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            transform: 'scale(1.1)'
          }}
        />
      )}

      {inView && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`lazy-img ${loaded ? 'loaded' : ''} ${className}`}
          onLoad={() => setLoaded(true)}
          onError={handleError}
        />
      )}

      {error && (
        <div className="lazy-img-error">
          <span>🍽️</span>
        </div>
      )}
    </div>
  );
}

export default LazyImage;