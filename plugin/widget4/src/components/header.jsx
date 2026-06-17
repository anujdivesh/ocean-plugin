import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
export default function Header({ theme, toggleTheme }) {
  return (
  <nav className="navbar navbar-expand-lg py-2" data-theme={theme} style={{
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border, #e2e8f0)',
      boxShadow: 'var(--card-shadow)',
      minHeight: '60px',
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
          <div style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <a style={{textDecoration: 'none', color: 'inherit'}} href="https://oceanportal2.spc.int" target="_blank" rel="noopener noreferrer">Pacific Ocean Portal</a> 
            <span style={{margin: '0 8px'}}>-</span>
            <Link style={{textDecoration: 'none', color: 'inherit'}} to="/">Ocean and climate outlook forum</Link>
          </div>
        </div>

        {/* Mobile Toggle Button */}
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
          style={{ borderColor: 'var(--color-border, #e2e8f0)' }}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navigation Items */}
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Left side - Explorer Button */}
          <div className="navbar-nav me-auto">
            {/* <button 
              className="btn btn-success" 
              style={{ 
                backgroundColor: 'var(--color-success)', 
                borderColor: 'var(--color-success)',
                color: 'white'
              }}
            >
              Explorer
            </button> */}
          </div>

          {/* Right side - Navigation Links and Theme Toggle */}
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
            {/* <li className="nav-item">
              <Link className="nav-link" to="/" style={{ color: 'var(--color-text)' }}>
                Home
              </Link>
            </li> */}
         
            <li className="nav-item d-flex align-items-center ms-3">
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}