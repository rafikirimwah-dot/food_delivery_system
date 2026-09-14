// frontend/src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!token || !user) return;

    const s = io('http://localhost:5000', {
      query: { userId: user.id, role: user.role },
      transports: ['websocket']
    });

    s.on('connect', () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    });
    s.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    });

    setSocket(s);
    return () => { s.close(); };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);