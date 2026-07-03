import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { io, Socket } from 'socket.io-client';
import { Toaster, toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { backendApi } from '../store/services/api';
import { useAppDispatch } from '../store/hooks';

interface NotificationContextType {
  unreadCount: number;
  socket: Socket | null;
  resetUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};

// Canvas drawing utility for dynamic red favicon badges
const updateFaviconBadge = (count: number) => {
  const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
  if (!favicon) return;

  if (count === 0) {
    favicon.href = '/favicon.svg';
    return;
  }

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0, 64, 64);

    // Draw red circle
    ctx.beginPath();
    ctx.arc(48, 16, 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444'; // red-500
    ctx.fill();

    // Draw white text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count > 9 ? '9+' : String(count), 48, 16);

    favicon.href = canvas.toDataURL('image/png');
  };
  img.src = '/favicon.svg';
};

export const NotificationProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);
  
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial count
  const { data: initialUnreadData } = backendApi.useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (initialUnreadData) {
      setUnreadCount(initialUnreadData.count);
    }
  }, [initialUnreadData]);

  // Sync favicon badge
  useEffect(() => {
    updateFaviconBadge(unreadCount);
  }, [unreadCount]);

  // Tab Title Alerts matching Discord behavior
  const originalTitle = useRef(document.title || 'dothething');
  
  useEffect(() => {
    if (document.title && !document.title.startsWith('(')) {
      originalTitle.current = document.title;
    }
  }, []);

  // Sync tab title with unreadCount
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${originalTitle.current}`;
    } else {
      document.title = originalTitle.current;
    }
  }, [unreadCount]);

  const playChime = (soundEnabled: boolean) => {
    if (!soundEnabled) return;
    const audio = new Audio('/sounds/notification.mp3');
    audio.play().catch((err) => console.log('Chime playback blocked or failed:', err));
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setUnreadCount(0);
      return;
    }

    const socket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.IO successfully connected to server');
    });

    socket.on('notification:new', (payload: any) => {
      console.log('Real-time notification received:', payload);
      
      setUnreadCount((prevCount) => {
        const newCount = payload.unreadCount !== undefined ? payload.unreadCount : prevCount + 1;
        return newCount;
      });

      // Play chime sound if enabled
      playChime(payload.soundEnabled !== false);

      // Trigger hot toast
      toast(payload.title, {
        description: payload.message,
        duration: 5000,
        className: 'rounded-2xl border-zinc-200 shadow-xl font-sans',
      });

      // Refetch cache queries
      dispatch(backendApi.util.invalidateTags(['Notification']));
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, isAuthenticated, dispatch]);

  const resetUnreadCount = () => {
    setUnreadCount(0);
    document.title = originalTitle.current;
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, socket: socketRef.current, resetUnreadCount }}>
      {children}
      <Toaster position="bottom-right" richColors closeButton />
    </NotificationContext.Provider>
  );
};
