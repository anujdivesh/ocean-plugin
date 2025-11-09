
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/header';
import Home from './pages/Home';

import './App.css';

function App() {
  // Initialize theme once (prefer sessionStorage > localStorage > media query)
  const [theme, setTheme] = useState(() => {
    try {
      const sessionPref = sessionStorage.getItem('theme');
      if (sessionPref === 'dark' || sessionPref === 'light') return sessionPref;
      const localPref = localStorage.getItem('theme');
      if (localPref === 'dark' || localPref === 'light') return localPref;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Apply theme class + persist to both storages for continuity within tab & future visits
  useEffect(() => {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    try { sessionStorage.setItem('theme', theme); localStorage.setItem('theme', theme); } catch {/* ignore */}
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <Router basename="/widget5">
      <div style={{ 
        backgroundColor: 'var(--color-background)', 
        minHeight: '100vh',
        transition: 'background-color 0.3s ease'
      }}>
        <Header theme={theme} toggleTheme={toggleTheme} />
        <Routes>
          <Route path="/" element={<Home />} />
        
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
