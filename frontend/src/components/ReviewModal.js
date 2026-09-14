// frontend/src/components/ReviewModal.js
import React, { useState } from 'react';
import { FaTimes, FaStar } from 'react-icons/fa';
import axios from 'axios';
import { useToast } from './ToastContext';
import './ReviewModal.css';

const REVIEW_TAGS = [
  'Tasty', 'Fresh', 'Great portions', 'Value for money',
  'Fast delivery', 'Well packaged', 'Will order again',
  'Hot on arrival', 'Authentic taste'
];

function ReviewModal({ order, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [deliveryRating, setDeliveryRating] = useState(5);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState('');
  const [tags, setTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!review.trim() || review.trim().length < 10) {
      return showToast('Please write at least 10 characters', 'warning');
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/reviews', {
        order_id: order.order_id,
        rating,
        food_rating: foodRating,
        delivery_rating: deliveryRating,
        title: title.trim() || null,
        review: review.trim(),
        tags: tags.length > 0 ? tags.join(',') : null
      }, { headers: { Authorization: `Bearer ${token}` } });
      showToast('Thank you for your review! ⭐', 'success');
      onSubmitted?.();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="review-modal-overlay" onClick={onClose}>
      <div className="review-modal" onClick={e => e.stopPropagation()}>
        <div className="rm-header">
          <div>
            <h2>Rate your experience</h2>
            <p className="rm-subtitle">
              {order.hotel_emoji} {order.hotel_name} · #{order.order_number}
            </p>
          </div>
          <button className="rm-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rm-body">
          <div className="rm-section">
            <label className="rm-label">How was your overall experience?</label>
            <div className="rm-stars">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  type="button"
                  key={n}
                  className={`rm-star ${n <= rating ? 'active' : ''}`}
                  onClick={() => setRating(n)}
                >
                  <FaStar />
                </button>
              ))}
              <span className="rm-rating-label">
                {rating === 5 ? 'Excellent!' :
                 rating === 4 ? 'Great' :
                 rating === 3 ? 'Good' :
                 rating === 2 ? 'Fair' : 'Poor'}
              </span>
            </div>
          </div>

          <div className="rm-section rm-two-col">
            <div>
              <label className="rm-label">Food quality</label>
              <div className="rm-stars rm-stars-sm">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={`rm-star-sm ${n <= foodRating ? 'active' : ''}`}
                    onClick={() => setFoodRating(n)}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="rm-label">Delivery</label>
              <div className="rm-stars rm-stars-sm">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={`rm-star-sm ${n <= deliveryRating ? 'active' : ''}`}
                    onClick={() => setDeliveryRating(n)}
                  >
                    <FaStar />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rm-section">
            <label className="rm-label">
              What stood out? <span className="rm-optional">(optional)</span>
            </label>
            <div className="rm-tags">
              {REVIEW_TAGS.map(tag => (
                <button
                  type="button"
                  key={tag}
                  className={`rm-tag ${tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="rm-section">
            <label className="rm-label">
              Give your review a title <span className="rm-optional">(optional)</span>
            </label>
            <input
              type="text"
              className="rm-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Best chicken in Nairobi!"
              maxLength={150}
            />
          </div>

          <div className="rm-section">
            <label className="rm-label">
              Tell us more <span className="rm-required">*</span>
            </label>
            <textarea
              className="rm-textarea"
              value={review}
              onChange={e => setReview(e.target.value)}
              placeholder="What did you love? What could be better?"
              rows="4"
              maxLength={1000}
              required
            />
            <div className="rm-char-count">{review.length} / 1000</div>
          </div>

          <div className="rm-actions">
            <button type="button" className="rm-btn ghost" onClick={onClose}>
              Maybe later
            </button>
            <button type="submit" className="rm-btn primary" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReviewModal;