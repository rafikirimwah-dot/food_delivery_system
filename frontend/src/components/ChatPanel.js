// frontend/src/components/ChatPanel.js
import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import './ChatPanel.css';

function ChatPanel({ orderId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const { socket } = useSocket();

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/orders/${orderId}/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchMessages();
  }, [orderId]);

  useEffect(() => {
    if (!socket) return;
    const handler = (payload) => {
      if (String(payload.order_id) === String(orderId)) fetchMessages();
    };
    socket.on('new_chat_message', handler);
    return () => socket.off('new_chat_message', handler);
  }, [socket, orderId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/orders/${orderId}/chat`,
        { message: text.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setText('');
      fetchMessages();
    } catch (err) {}
    finally { setSending(false); }
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>💬 Chat</h3>
        <p>Message the restaurant directly</p>
      </div>

      <div className="chat-list">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Say hi!</div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`chat-bubble ${m.sender_id === user?.id ? 'mine' : 'theirs'}`}>
            <div className="bubble-name">{m.sender_name}</div>
            <div className="bubble-text">{m.message}</div>
            <div className="bubble-time">
              {new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message…"
        />
        <button onClick={send} disabled={sending || !text.trim()}>
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}

export default ChatPanel;