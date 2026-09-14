// frontend/src/components/ReviewsList.js
import React, { useState, useEffect } from 'react';
import { FaStar } from 'react-icons/fa';
import axios from 'axios';
import './ReviewsList.css';

function ReviewsList({ hotelId }) {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const [reviewsRes, summaryRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/hotels/${hotelId}/reviews?limit=30`),
          axios.get(`http://localhost:5000/api/hotels/${hotelId}/reviews/summary`)
        ]);
        setReviews(reviewsRes.data);
        setSummary(summaryRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [hotelId]);

  if (loading) return <div className="reviews-loading">Loading reviews…</div>;

  if (!summary || summary.total === 0) {
    return (
      <div className="reviews-empty">
        <div className="re-empty-icon">⭐</div>
        <h3>No reviews yet</h3>
        <p>Be the first to share your experience after ordering.</p>
      </div>
    );
  }

  const renderStars = (value, size = 'sm') => {
    return Array.from({ length: 5 }).map((_, i) => (
      <FaStar key={i} className={`star-${size} ${i < Math.round(value) ? 'filled' : ''}`} />
    ));
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  return (
    <div className="reviews-section">
      <div className="reviews-summary">
        <div className="rs-left">
          <div className="rs-big-number">{parseFloat(summary.avg_rating || 0).toFixed(1)}</div>
          <div className="rs-stars">{renderStars(summary.avg_rating, 'md')}</div>
          <div className="rs-total">{summary.total} review{summary.total !== 1 && 's'}</div>
        </div>

        <div className="rs-bars">
          {[5, 4, 3, 2, 1].map(star => {
            const key = ['one_star', 'two_star', 'three_star', 'four_star', 'five_star'][star - 1];
            const count = summary[key] || 0;
            const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
            return (
              <div className="rs-bar-row" key={star}>
                <span className="rs-bar-label">{star} ★</span>
                <div className="rs-bar-track">
                  <div className="rs-bar-fill" style={{ width: `${pct}%` }}></div>
                </div>
                <span className="rs-bar-count">{count}</span>
              </div>
            );
          })}
        </div>

        <div className="rs-metrics">
          <div className="rs-metric">
            <div className="rs-metric-label">Food</div>
            <div className="rs-metric-value">{parseFloat(summary.avg_food || 0).toFixed(1)}</div>
            <div className="rs-metric-stars">{renderStars(summary.avg_food)}</div>
          </div>
          <div className="rs-metric">
            <div className="rs-metric-label">Delivery</div>
            <div className="rs-metric-value">{parseFloat(summary.avg_delivery || 0).toFixed(1)}</div>
            <div className="rs-metric-stars">{renderStars(summary.avg_delivery)}</div>
          </div>
        </div>
      </div>

      <div className="reviews-list">
        <h3 className="reviews-heading">What customers are saying</h3>

        {visibleReviews.map(r => (
          <div className="review-card" key={r.id}>
            <div className="review-head">
              <div className="review-avatar">
                {r.customer_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="review-author">
                <div className="review-name">{r.customer_name}</div>
                <div className="review-date">{formatDate(r.created_at)}</div>
              </div>
              <div className="review-rating">{renderStars(r.rating, 'sm')}</div>
            </div>

            {r.title && <div className="review-title">{r.title}</div>}
            <p className="review-body">{r.review}</p>

            {r.tags && (
              <div className="review-tags">
                {r.tags.split(',').map((t, i) => (
                  <span key={i} className="review-tag">{t.trim()}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        {reviews.length > 3 && !showAll && (
          <button className="show-all-btn" onClick={() => setShowAll(true)}>
            Show all {reviews.length} reviews
          </button>
        )}
      </div>
    </div>
  );
}

export default ReviewsList;