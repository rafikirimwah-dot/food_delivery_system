import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return <main><section className="hero"><div className="hero-copy"><p className="eyebrow">Good food, right on time</p><h1>Your city is on the menu.</h1><p>Browse independent kitchens, find your craving, and bring a better dinner home.</p><Link className="button primary" to="/hotels">Explore restaurants</Link></div><div className="hero-note"><span>Today’s note</span><strong>Fresh choices.<br />No fuss.</strong><small>Fast ordering from local favorites.</small></div></section><section className="page feature-grid"><article><span className="feature-number">01</span><h2>Choose a kitchen</h2><p>Compare menus and discover new neighborhood favorites.</p></article><article><span className="feature-number">02</span><h2>Build your order</h2><p>Keep your meal together in one simple, flexible cart.</p></article><article><span className="feature-number">03</span><h2>Enjoy the arrival</h2><p>Follow every order from preparation to your doorstep.</p></article></section></main>;
}
export default Home;
