import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaClock, FaMotorcycle, FaFire } from 'react-icons/fa';
import axios from 'axios';
import './Home.css';

function Home() {
  const [hotels, setHotels] = useState([]);
  const [offerItem, setOfferItem] = useState(null);
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hotelsRes, offerRes, featuredRes] = await Promise.all([
          axios.get('http://localhost:5000/api/hotels'),
          axios.get('http://localhost:5000/api/offers/random'),
          axios.get('http://localhost:5000/api/hotels/featured')
        ]);
        
        setHotels(hotelsRes.data);
        setOfferItem(offerRes.data);
        setFeaturedHotels(featuredRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cuisineTypes = ['All', 'Pizza', 'Burgers', 'Chicken', 'Pasta', 'Sushi', 'Fast Food'];

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Delicious Food, <span>Delivered Fast</span></h1>
          <p>Order from your favorite restaurants and get it delivered to your doorstep</p>
          <div className="hero-search">
            <input type="text" placeholder="Search for restaurants or dishes..." />
            <button>Find Food</button>
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">50+</span>
            <span className="stat-label">Restaurants</span>
          </div>
          <div className="stat">
            <span className="stat-number">200+</span>
            <span className="stat-label">Dishes</span>
          </div>
          <div className="stat">
            <span className="stat-number">1000+</span>
            <span className="stat-label">Happy Customers</span>
          </div>
        </div>
      </section>

      {/* Daily Offer */}
      {offerItem && (
        <section className="offer-section">
          <div className="offer-card">
            <div className="offer-badge">
              <FaFire /> Today's Special
            </div>
            <div className="offer-content">
              <div className="offer-image">
                <img src={`https://picsum.photos/seed/${offerItem.id}/400/300`} alt={offerItem.name} />
              </div>
              <div className="offer-details">
                <h3>{offerItem.name}</h3>
                <p>{offerItem.description}</p>
                <div className="offer-pricing">
                  <span className="original-price">${offerItem.price}</span>
                  <span className="discounted-price">${offerItem.discounted_price}</span>
                  <span className="discount-badge">-10%</span>
                </div>
                <p className="offer-hotel">From {offerItem.hotel_name}</p>
                <Link to={`/hotel/${offerItem.hotel_id}`} className="offer-btn">
                  Order Now
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Hotels */}
      <section className="featured-section">
        <div className="section-header">
          <h2>🌟 Featured Restaurants</h2>
          <Link to="/hotels" className="view-all">View All →</Link>
        </div>
        <div className="featured-grid">
          {featuredHotels.map(hotel => (
            <Link to={`/hotel/${hotel.id}`} key={hotel.id} className="featured-card">
              <div className="featured-image">
                <img src={`https://picsum.photos/seed/hotel${hotel.id}/400/250`} alt={hotel.name} />
                <div className="featured-rating">
                  <FaStar /> {hotel.rating}
                </div>
              </div>
              <div className="featured-info">
                <h3>{hotel.name}</h3>
                <p className="cuisine">{hotel.cuisine_type}</p>
                <div className="featured-meta">
                  <span><FaClock /> 30-45 min</span>
                  <span><FaMotorcycle /> Free Delivery</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* All Hotels */}
      <section className="all-hotels-section">
        <div className="section-header">
          <h2>🍽️ All Restaurants</h2>
          <div className="filter-tabs">
            {cuisineTypes.map(type => (
              <button key={type} className="filter-tab">
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="hotels-grid">
          {hotels.map(hotel => (
            <Link to={`/hotel/${hotel.id}`} key={hotel.id} className="hotel-card">
              <div className="hotel-image">
                <img src={`https://picsum.photos/seed/hotel${hotel.id}/300/200`} alt={hotel.name} />
              </div>
              <div className="hotel-info">
                <h3>{hotel.name}</h3>
                <p className="cuisine">{hotel.cuisine_type}</p>
                <div className="hotel-rating">
                  <FaStar className="star-icon" />
                  <span>{hotel.rating || 'New'}</span>
                </div>
                <p className="hotel-description">{hotel.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;