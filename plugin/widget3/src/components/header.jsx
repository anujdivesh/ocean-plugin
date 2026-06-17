import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
export default function Header({ theme, toggleTheme }) {
  return (
  <nav className="navbar navbar-expand-lg py-2" data-theme={theme} style={{
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border, #e2e8f0)',
      boxShadow: 'var(--card-shadow)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${process.env.PUBLIC_URL + '/SPC_Header3.png'})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          opacity: 0.7,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div className="container-fluid" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="navbar-brand d-flex align-items-center">
          <Link to="/" className="d-flex align-items-center text-decoration-none me-3">
            <img 
              src={process.env.PUBLIC_URL + '/COSPPaC_white_crop2.png'} 
              alt="COSPPaC Logo" 
              height="30" 
              className="d-inline-block align-text-top me-2"
              style={{ 
                filter: 'brightness(0) saturate(100%) invert(15%) sepia(100%) saturate(10000%) hue-rotate(210deg) brightness(100%) contrast(100%)',
                transition: 'filter 0.3s ease'
              }}
            />
          </Link>
          <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1.1rem', position: 'relative', zIndex: 10 }}>
            <a 
              style={{
                textDecoration: 'none', 
                color: 'inherit', 
                cursor: 'pointer', 
                display: 'inline-block',
                position: 'relative',
                zIndex: 11,
                padding: '2px 4px',
                borderRadius: '2px'
              }} 
              href="https://oceanportal2.spc.int" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Pacific Ocean Portal
            </a> 
            <span style={{margin: '0 8px'}}>-</span>
            <Link style={{textDecoration: 'none', color: 'inherit'}} to="/">Real-Time Ocean Monitoring</Link>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-grow-1 d-flex align-items-center justify-content-end" id="navbarNav">
          <ul className="navbar-nav mb-0 d-flex align-items-center">
            <li className="nav-item d-flex align-items-center">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}