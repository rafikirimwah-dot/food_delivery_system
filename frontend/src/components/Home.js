import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [location, setLocation] = useState('');
  const navigate = useNavigate();
  const browse = (event) => {
    event.preventDefault();
    const query = location.trim() ? `?location=${encodeURIComponent(location.trim())}` : '';
    navigate(`/hotels${query}`);
  };

  return <main className="home-page"><section className="hero"><div className="hero-copy"><p className="eyebrow">Good food, right on time</p><h1>Your city is on the menu.</h1><p>Browse independent kitchens, find your craving, and bring a better dinner home.</p><form className="location-search" onSubmit={browse}><label htmlFor="home-location">Where are you eating?</label><div><span className="location-pin">⌖</span><input id="home-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Enter your area or city" /><button className="button primary" type="submit">Find food <span>↗</span></button></div><small>Try City Center, Riverside, or Downtown</small></form></div><div className="hero-side"><div className="hero-photo" /><div className="hero-note"><span>Today’s note</span><strong>Fresh choices.<br />No fuss.</strong><small>Fast ordering from local favorites.</small></div></div></section><section className="page feature-grid"><div className="section-intro"><p className="eyebrow">How it works</p><h2>Good food,<br />thoughtfully delivered.</h2></div><div className="feature-steps"><article><span className="feature-number">01</span><h2>Choose a kitchen</h2><p>Compare menus and discover new neighborhood favorites.</p></article><article><span className="feature-number">02</span><h2>Build your order</h2><p>Keep your meal together in one simple, flexible cart.</p></article><article><span className="feature-number">03</span><h2>Enjoy the arrival</h2><p>Follow every order from preparation to your doorstep.</p></article></div></section></main>;
}
export default Home;
