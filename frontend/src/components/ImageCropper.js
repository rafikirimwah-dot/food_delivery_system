// frontend/src/components/ImageCropper.js
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FaCheck, FaTimes, FaUndo } from 'react-icons/fa';
import './ImageCropper.css';

function ImageCropper({ image, aspect = 16 / 9, onSave, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const createCroppedImage = async () => {
    try {
      const image_ = await createImage(image);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        image_,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0, 0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      return new Promise((resolve) => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.92);
      });
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleSave = async () => {
    const blob = await createCroppedImage();
    if (blob) {
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onSave(file, URL.createObjectURL(blob));
    }
  };

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <h3>Adjust your photo</h3>
          <button className="cropper-close" onClick={onCancel}>
            <FaTimes />
          </button>
        </div>

        <div className="cropper-stage">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="cropper-controls">
          <div className="cropper-zoom">
            <span>Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
            />
            <span>{Math.round(zoom * 100)}%</span>
          </div>

          <button
            className="cropper-reset"
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
          >
            <FaUndo /> Reset
          </button>
        </div>

        <div className="cropper-actions">
          <button className="btn-ghost-warm" onClick={onCancel}>Cancel</button>
          <button className="btn-primary-warm" onClick={handleSave}>
            <FaCheck /> Use This
          </button>
        </div>
      </div>
    </div>
  );
}

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', err => reject(err));
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });

export default ImageCropper;