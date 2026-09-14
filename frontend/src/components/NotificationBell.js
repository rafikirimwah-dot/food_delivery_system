// frontend/src/components/NotificationBell.js
import React, { useState, useEffect } from 'react';
import { FaBell, FaCircle } from 'react-icons/fa';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useToast } from './ToastContext';
import './NotificationBell.css';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const token = localStorage.getItem('token');
  const { socket, connected } = useSocket();
  const { showToast } = useToast();

  useEffect(() => {
    if (!token) return;
    const fetchNotifs = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/users/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.is_read).length);
      } catch (err) {}
    };
    fetchNotifs();
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const onNewNotif = (payload) => {
      const newNotif = {
        id: `rt_${Date.now()}`,
        title: payload.title || 'New notification',
        message: payload.message || '',
        type: payload.type || 'system',
        is_read: false,
        created_at: payload.created_at || new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 30));
      setUnreadCount(c => c + 1);
      showToast(`${payload.title}: ${payload.message}`, 'info');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(payload.title, { body: payload.message });
      }
    };

    ['new_order', 'order_status_changed', 'payment_released', 'new_review', 'new_chat_message', 'new_notification']
      .forEach(evt => socket.on(evt, onNewNotif));

    return () => {
      ['new_order', 'order_status_changed', 'payment_released', 'new_review', 'new_chat_message', 'new_notification']
        .forEach(evt => socket.off(evt, onNewNotif));
    };
  }, [socket, showToast]);

  const markAllRead = async () => {
    try {
      await axios.put('http://localhost:5000/api/users/notifications/read-all', {},
        { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {}
  };

  if (!token) return null;

  return (
    <div className="notif-bell-wrap">
      <button className="notif-bell" onClick={() => setOpen(!open)} aria-label="Notifications">
        <FaBell />
        {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
        {connected && <span className="notif-live-dot"><FaCircle /></span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-head">
            <h4>Notifications {connected && <span className="live-pill">Live</span>}</h4>
            {unreadCount > 0 && <button onClick={markAllRead}>Mark all read</button>}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">You're all caught up ✨</div>
            )}
            {notifications.map(n => (
              <div key={n.id} className={`notif-item ${n.is_read ? 'read' : ''}`}>
                <div className="ni-title">{n.title}</div>
                <div className="ni-msg">{n.message}</div>
                <div className="ni-time">
                  {new Date(n.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;