import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppSelector } from '@/store/hooks';

type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settingsTheme, autoMode, lightStartHour, darkStartHour } = useAppSelector((state) => state.ui);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const calculateTheme = (): ResolvedTheme => {
      if (settingsTheme === 'light') return 'light';
      if (settingsTheme === 'dark') return 'dark';
      
      // Automatic mode
      if (settingsTheme === 'auto') {
        if (autoMode === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else {
          // Time-based
          const hour = new Date().getHours();
          if (lightStartHour < darkStartHour) {
            return (hour >= lightStartHour && hour < darkStartHour) ? 'light' : 'dark';
          } else {
            return (hour >= lightStartHour || hour < darkStartHour) ? 'light' : 'dark';
          }
        }
      }
      return 'light';
    };

    // Set initial theme
    const resolved = calculateTheme();
    setResolvedTheme(resolved);

    // Apply class to html
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set up listeners/timers
    let intervalId: any;
    let mediaQuery: MediaQueryList | null = null;
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (settingsTheme === 'auto' && autoMode === 'system') {
        const res = e.matches ? 'dark' : 'light';
        setResolvedTheme(res);
        if (res === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    if (settingsTheme === 'auto') {
      if (autoMode === 'system') {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', handleSystemThemeChange);
      } else {
        // Time-based checks every 10 seconds to respond instantly
        intervalId = setInterval(() => {
          const res = calculateTheme();
          setResolvedTheme(res);
          if (res === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, 10000);
      }
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      }
    };
  }, [settingsTheme, autoMode, lightStartHour, darkStartHour]);

  return (
    <ThemeContext.Provider value={{ resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
