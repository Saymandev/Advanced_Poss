'use client';

import { useCallback, useEffect, useState } from 'react';

export interface Notification {
  id: string;
  type: 'order' | 'payment' | 'kitchen' | 'system' | 'promotion';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

// Simple global store so all uses of this hook share the same notifications
let globalNotifications: Notification[] = [];
const listeners: Array<(notifications: Notification[]) => void> = [];
let hasLoadedFromStorage = false;

const notifyListeners = () => {
  for (const listener of listeners) {
    listener(globalNotifications);
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(
        'restaurant-notifications',
        JSON.stringify(globalNotifications),
      );
    } catch (error) {
      console.warn('Failed to persist notifications:', error);
    }
  }
};

const loadFromStorageIfNeeded = () => {
  if (hasLoadedFromStorage) return;
  hasLoadedFromStorage = true;
  if (typeof window === 'undefined') return;

  const saved = window.localStorage.getItem('restaurant-notifications');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      globalNotifications = parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load notifications from localStorage:', error);
    }
  }
};

export const useNotifications = (): UseNotificationsReturn => {
  // Ensure global store is loaded once
  loadFromStorageIfNeeded();

  const [notifications, setNotifications] = useState<Notification[]>(globalNotifications);

  // Subscribe this hook instance to global changes
  useEffect(() => {
    const listener = (next: Notification[]) => {
      setNotifications(next);
    };
    listeners.push(listener);
    // Immediately sync with current global state
    listener(globalNotifications);

    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    };

    globalNotifications = [newNotification, ...globalNotifications];
    notifyListeners();

    // Play notification sound
    playNotificationSound(notification.type);

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new window.Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: newNotification.id,
      });
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    globalNotifications = globalNotifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    notifyListeners();
  }, []);

  const markAllAsRead = useCallback(() => {
    globalNotifications = globalNotifications.map((n) => ({ ...n, read: true }));
    notifyListeners();
  }, []);

  const clearNotification = useCallback((id: string) => {
    globalNotifications = globalNotifications.filter((n) => n.id !== id);
    notifyListeners();
  }, []);

  const clearAll = useCallback(() => {
    globalNotifications = [];
    notifyListeners();
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
};

// Play notification sound based on type
const playNotificationSound = (type: Notification['type']) => {
  try {
    // Create audio context for web audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Different frequencies for different notification types
    const frequencies = {
      order: 800,
      payment: 600,
      kitchen: 1000,
      system: 400,
      promotion: 700,
    };

    const frequency = frequencies[type];
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';

    // Quick fade in and out
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

// Request notification permission on mount
if (typeof window !== 'undefined' && 'Notification' in window) {
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
