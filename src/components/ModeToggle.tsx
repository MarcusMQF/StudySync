import { useEffect, useState } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

export const ModeToggle = () => {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('light-mode', savedTheme === 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light-mode', newTheme === 'light');
  };

  if (!mounted) return null;

  return (
    <button 
      className="action-button theme-toggle-button" 
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <FaMoon /> : <FaSun />}
      {theme === 'light' ? 'Dark' : 'Light'}
    </button>
  );
}; 