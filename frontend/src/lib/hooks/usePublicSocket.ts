'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Get socket URL from environment or default to API URL
const getSocketUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:5000';
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  // Extract base URL (remove /api/v1 if present)
  const baseUrl = apiUrl.replace(/\/api\/v1$/, '');
  return baseUrl;
};

const SOCKET_URL = getSocketUrl();

interface UsePublicSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinOrder: (orderId: string) => void;
  leaveOrder: (orderId: string) => void;
}

export const usePublicSocket = (): UsePublicSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const orderIdRef = useRef<string | null>(null);

  // Initialize socket connection (no auth required for public)
  useEffect(() => {
    const newSocket = io(`${SOCKET_URL}/ws`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('✅ Public Socket.IO connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Public Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Public Socket.IO connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      console.log('🧹 Cleaning up public socket connection');
      newSocket.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  const joinOrder = (orderId: string) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket not ready for joining order room');
      return;
    }

    if (orderIdRef.current && orderIdRef.current !== orderId) {
      // Leave previous order room if different
      socket.emit('leave-order', { orderId: orderIdRef.current });
    }

    socket.emit('join-order', { orderId });
    orderIdRef.current = orderId;
    console.log(`✅ Joined order room: ${orderId}`);
  };

  const leaveOrder = (orderId: string) => {
    if (!socket || !isConnected) return;

    socket.emit('leave-order', { orderId });
    if (orderIdRef.current === orderId) {
      orderIdRef.current = null;
    }
    console.log(`✅ Left order room: ${orderId}`);
  };

  return {
    socket,
    isConnected,
    joinOrder,
    leaveOrder,
  };
};

