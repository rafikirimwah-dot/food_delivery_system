import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { FaArrowLeft, FaPhone, FaCheckCircle, FaClock } from 'react-icons/fa';
import axios from 'axios';
import './OrderTracking.css';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderPos, setRiderPos] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/orders/${id}/track`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrder(res.data);
        if (res.data.delivery_person) {
          setRiderPos({ lat: res.data.delivery_person.lat, lng: res.data.delivery_person.lng });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
    const int = setInterval(fetchOrder, 5000);
    return () => clearInterval(int);
  }, [id]);

  const steps = [
    { key: 'pending',   label: 'Order placed' },
    { key: 'confirmed', label: 'Confirmed by restaurant' },
    { key: 'preparing', label: 'Being prepared' },
    { key: 'ready',     label: 'Ready for pickup' },
    { key: 'delivered', label: 'On the way' },
    { key: 'completed', label: 'Delivered' }
  ];

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!order) return <div className="loading-container"><p>Order not found</p></div>;
  if (loadError) return <div className="loading-container"><p>Error loading Google Maps. Please check your API key.</p></div>;
  if (!isLoaded) return <div className="loading-container"><div className="spinner" /></div>;

  const currentIndex = steps.findIndex(s => s.key === order.status);
  const hotelLocation = { lat: order.hotel_lat || -1.286389, lng: order.hotel_lng || 36.817223 };
  const deliveryLocation = order.delivery_lat ? { lat: order.delivery_lat, lng: order.delivery_lng } : null;

  return (
    <div className="track-page-warm">
      <Link to="/my-orders" className="back-btn-warm">
        <FaArrowLeft /> Back to Orders
      </Link>

      <div className="track-head-warm">
        <div>
          <h1>Order #{order.order_number || order.id}</h1>
          <p>{order.hotel_emoji} {order.hotel_name}</p>
        </div>
        <div className="track-eta-warm">
          <FaClock /> Arriving in ~{Math.max(5, 30 - currentIndex * 5)} min
        </div>
      </div>

      <div className="track-grid-warm">
        <div className="track-map-warm">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={hotelLocation}
            zoom={14}
            options={{
              disableDefaultUI: false,
              scrollwheel: false,
            }}
          >
            {/* Hotel marker */}
            <Marker
              position={hotelLocation}
              title={order.hotel_name}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: '#FF6B6B',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 2,
              }}
            />

            {/* Delivery location marker */}
            {deliveryLocation && (
              <Marker
                position={deliveryLocation}
                title="Your location"
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#4ECDC4',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }}
              />
            )}

            {/* Rider marker */}
            {riderPos && (
              <Marker
                position={riderPos}
                title="Rider location"
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 14,
                  fillColor: '#C97B5F',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 3,
                }}
              />
            )}

            {/* Route line */}
            {deliveryLocation && riderPos && (
              <Polyline
                path={[hotelLocation, riderPos, deliveryLocation]}
                options={{
                  strokeColor: '#C97B5F',
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                  geodesic: true,
                }}
              />
            )}
          </GoogleMap>
        </div>

        <aside className="track-side-warm">
          <div className="rider-card-warm">
            <div className="rider-avatar-warm">🛵</div>
            <div className="rider-info-warm">
              <div className="rider-label-warm">Your rider</div>
              <h3>James Mwangi</h3>
              <div className="rider-meta-warm">⭐ 4.9 · 500+ deliveries</div>
            </div>
            <a href="tel:+254712345678" className="rider-call-warm">
              <FaPhone />
            </a>
          </div>

          <div className="timeline-warm">
            <h3>Order progress</h3>
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={`tl-item-warm ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}
              >
                <div className="tl-dot-warm">
                  {i < currentIndex ? <FaCheckCircle /> : <span>•</span>}
                </div>
                <div>
                  <div className="tl-label-warm">{s.label}</div>
                  <div className="tl-time-warm">{i <= currentIndex ? 'Completed' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default OrderTracking;