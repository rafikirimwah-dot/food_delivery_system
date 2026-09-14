// frontend/src/components/RelatedItems.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LazyImage from './LazyImage';
import './RelatedItems.css';

function RelatedItems({ currentItemId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!currentItemId) return;
    axios.get(`http://localhost:5000/api/food-items/${currentItemId}/related`)
      .then(res => setItems(res.data))
      .catch(() => {});
  }, [currentItemId]);

  if (items.length === 0) return null;

  return (
    <div className="related-section">
      <h3>Customers also ordered</h3>
      <div className="related-grid">
        {items.map(item => (
          <div className="related-card" key={item.id}>
            <LazyImage src={item.image_url} alt={item.name} aspectRatio="1/1" />
            <div>
              <div className="rc-hotel">{item.hotel_emoji} {item.hotel_name}</div>
              <div className="rc-name">{item.name}</div>
              <div className="rc-price">KSh {Math.round(item.price).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RelatedItems;