'use client';

import { motion } from 'framer-motion';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    console.log('Changing theme to:', newTheme);
    setTheme(newTheme);
  };

  if (!mounted) {
    return (
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        <div className="w-8 h-8 rounded-md bg-gray-200 animate-pulse" />
        <div className="w-8 h-8 rounded-md bg-gray-200 animate-pulse" />
        <div className="w-8 h-8 rounded-md bg-gray-200 animate-pulse" />
      </div>
    );
  }

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {themes.map(({ value, icon: Icon, label }) => (
        <motion.button
          key={value}
          onClick={() => handleThemeChange(value)}
          className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
            theme === value
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title={label}
          type="button"
        >
          <Icon size={16} />
        </motion.button>
      ))}
    </div>
  );
}
