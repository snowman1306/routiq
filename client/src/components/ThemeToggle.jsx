import React from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`toggle-icon ${theme === 'light' ? 'active' : ''}`}>
        <SunMedium size={16} />
      </span>
      <span className={`toggle-thumb ${theme === 'dark' ? 'is-dark' : ''}`} />
      <span className={`toggle-icon ${theme === 'dark' ? 'active' : ''}`}>
        <Moon size={16} />
      </span>
    </button>
  );
}

export default ThemeToggle;
