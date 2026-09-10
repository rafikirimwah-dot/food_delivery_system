import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaArrowLeft, FaMotorcycle, FaPhone, FaCheckCircle, FaClock } from 'react-icons/fa';
import axios from 'axios';
import './OrderTracking.css';

const riderIcon = L.divIcon({
  className: 'rider-marker',
  html: `<div style="
    background: #FF3D68;
    width: 50px; height: 50px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem;
    box-shadow: 0 0 30px #FF3D68, 0 0 60px #FF3D6880;
    border: 3px solid white;
    animation: pulse-glow 2s infinite;
  ">🛵</div>`,
  iconSize: [50, 50],
  iconAnchor: [25, 25]
});

function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [riderPos, setRiderPos] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/orders/${id}/track`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrder(res.data);
        if (res.data.delivery_person) {
          setRiderPos([res.data.delivery_person.lat, res.data.delivery_person.lng]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    // Simulate live updates every 5 seconds
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: '✅', time: '2 min ago' },
    { key: 'confirmed', label: 'Confirmed by Hotel', icon: '✅', time: '1 min ago' },
    { key: 'preparing', label: 'Preparing Food', icon: '👨‍🍳', time: 'In progress' },
    { key: 'ready', label: 'Ready for Pickup', icon: '📦', time: 'Pending' },
    { key: 'delivered', label: 'On the Way', icon: '🛵', time: 'Pending' },
    { key: 'completed', label: 'Delivered', icon: '🎉', time: 'Pending' }
  ];

  const currentStepIndex = statusSteps.findIndex(s => s.key === order?.status);

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!order) return <div className="loading-container">Order not found</div>;

  return (
    <div className="tracking-page">
      <Link to="/my-orders" className="back-link">
        <FaArrowLeft /> Back to Orders
      </Link>

      <div className="tracking-header">
        <div>
          <h1>Order #{order.order_number || order.id}</h1>
          <p>{order.hotel_emoji} {order.hotel_name}</p>
        </div>
        <div className="tracking-status-badge">
          <FaClock /> Arriving in ~{Math.max(5, 30 - currentStepIndex * 5)} min
        </div>
      </div>

      <div className="tracking-grid">
        {/* MAP */}
        <div className="tracking-map-wrap">
          <MapContainer
            center={[order.hotel_lat, order.hotel_lng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[order.hotel_lat, order.hotel_lng]}>
              <Popup>{order.hotel_name}</Popup>
            </Marker>
            {order.delivery_lat && (
              <Marker position={[order.delivery_lat, order.delivery_lng]}>
                <Popup>Your Location</Popup>
              </Marker>
            )}
            {riderPos && (
              <Marker position={riderPos} icon={riderIcon}>
                <Popup>James is on the way! 🛵</Popup>
              </Marker>
            )}
            {order.delivery_lat && riderPos && (
              <Polyline
                positions={[
                  [order.hotel_lat, order.hotel_lng],
                  riderPos,
                  [order.delivery_lat, order.delivery_lng]
                ]}
                pathOptions={{ color: '#C6FF00', weight: 4, dashArray: '10, 10' }}
              />
            )}
          </MapContainer>
        </div>

        {/* RIDER + STATUS */}
        <div className="tracking-side">
          <div className="rider-card">
            <div className="rider-avatar">🛵</div>
            <div className="rider-info">
              <div className="rider-label">Your Rider</div>
              <h3>James Mwangi</h3>
              <div className="rider-meta">⭐ 4.9 · 500+ deliveries</div>
            </div>
            <a href="tel:+254712345678" className="rider-call">
              <FaPhone />
            </a>
          </div>

          <div className="status-timeline">
            <h3>Order Progress</h3>
            {statusSteps.map((step, idx) => (
              <div 
                key={step.key} 
                className={`tl-item ${idx <= currentStepIndex ? 'done' : ''} ${idx === currentStepIndex ? 'current' : ''}`}
              >
                <div className="tl-dot">
                  {idx < currentStepIndex ? <FaCheckCircle /> : <span>{step.icon}</span>}
                </div>
                <div className="tl-content">
                  <div className="tl-label">{step.label}</div>
                  <div className="tl-time">{idx <= currentStepIndex ? 'Completed' : 'Pending'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderTracking;