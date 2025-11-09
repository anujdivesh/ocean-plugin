import React, { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  useEffect(() => {
    // Load theme from localStorage on component mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.body.classList.remove('dark-mode');
    } else {
      setIsDark(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="form-check form-switch d-flex align-items-center">
      <input
        className="form-check-input me-2"
        type="checkbox"
        role="switch"
        id="themeToggle"
        checked={isDark}
        onChange={toggleTheme}
      />
      <label className="form-check-label" htmlFor="themeToggle" style={{ color: 'var(--color-text)' }}>
        {isDark ? (
          <i className="bi bi-moon-fill" style={{ color: 'var(--color-primary)' }}></i>
        ) : (
          <i className="bi bi-sun-fill" style={{ color: '#0065f8' }}></i>
        )}
      </label>
    </div>
  );
}
