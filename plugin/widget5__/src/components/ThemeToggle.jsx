import React from 'react';

// Controlled theme toggle: relies on parent for state, no side-effects here.
export default function ThemeToggle({ theme, toggleTheme }) {
  const isDark = theme === 'dark';
  return (
    <div className="form-check form-switch d-flex align-items-center" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <input
        className="form-check-input me-2"
        type="checkbox"
        role="switch"
        id="themeToggle"
        checked={isDark}
        onChange={toggleTheme}
        aria-label="Toggle dark mode"
      />
      <label className="form-check-label" htmlFor="themeToggle" style={{ color: 'var(--color-text)', cursor: 'pointer' }}>
        {isDark ? (
          <i className="bi bi-moon-fill" style={{ color: 'var(--color-primary)' }} />
        ) : (
          <i className="bi bi-sun-fill" style={{ color: '#f59e42' }} />
        )}
      </label>
    </div>
  );
}
