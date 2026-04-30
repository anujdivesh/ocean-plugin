import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import GPUParticleDemo from './pages/GPUParticleDemo';
import './App.css';
import Header from './components/header';
import './utils/NotificationManager'; // Initialize notification system
import { initConsoleErrorSuppressor } from './utils/ConsoleErrorSuppressor';

function App() {
  useEffect(() => {
    // Authentication is temporarily disabled for widget 5.
    initConsoleErrorSuppressor();
  }, []);

  return (
    <Router 
      basename={process.env.NODE_ENV === 'development' ? '/' : process.env.PUBLIC_URL}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div style={{ 
        backgroundColor: 'var(--color-background)', 
        minHeight: '100vh',
        transition: 'background-color 0.3s ease'
      }}>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gpu-demo" element={<GPUParticleDemo />} />
          {/* <Route path="/link1" element={<Link1 />} />
          <Route path="/link2" element={<Link2 />} />
          <Route path="/link3" element={<Link3 />} /> */}
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
