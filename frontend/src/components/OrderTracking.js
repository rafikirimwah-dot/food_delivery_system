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
    background: #C97B5F;
    width: 48px; height: 48px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem;
    box-shadow: 0 8px 24px rgba(201, 123, 95, 0.5);
    border: 3px solid #FFFFFF;
  ">🛵</div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24]
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

  const currentIndex = steps.findIndex(s => s.key === order.status);

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
          <MapContainer
            center={[order.hotel_lat || -1.286389, order.hotel_lng || 36.817223]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <Marker position={[order.hotel_lat || -1.286389, order.hotel_lng || 36.817223]}>
              <Popup>{order.hotel_name}</Popup>
            </Marker>
            {order.delivery_lat && (
              <Marker position={[order.delivery_lat, order.delivery_lng]}>
                <Popup>Your location</Popup>
              </Marker>
            )}
            {riderPos && (
              <Marker position={riderPos} icon={riderIcon}>
                <Popup>James is on the way 🛵</Popup>
              </Marker>
            )}
            {order.delivery_lat && riderPos && (
              <Polyline
                positions={[
                  [order.hotel_lat || -1.286389, order.hotel_lng || 36.817223],
                  riderPos,
                  [order.delivery_lat, order.delivery_lng]
                ]}
                pathOptions={{ color: '#C97B5F', weight: 4, dashArray: '8, 8' }}
              />
            )}
          </MapContainer>
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