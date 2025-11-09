/**
 * Professional Cartographic Compass Rose
 * Follows traditional cartographic principles with modern UI integration
 * Includes responsive positioning and rotation support
 */
import React, { useState, useEffect } from 'react';
import './CompassRose.css';

const CompassRose = ({ 
  position = 'bottom-left', 
  size = 100, 
  mapRotation = 0,
  responsive = true 
}) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  
  // Responsive positioning: switch to bottom-left on mobile
  useEffect(() => {
    if (!responsive) return;
    
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && position === 'top-right') {
        setCurrentPosition('bottom-left');
      } else {
        setCurrentPosition(position);
      }
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position, responsive]);
  const positionStyles = {
    'top-left': { top: '15px', left: '15px' },
    'top-right': { top: '15px', right: '15px' }, // Better padding from edges
    'bottom-left': { bottom: '120px', left: '15px' }, // Away from legend/controls
    'bottom-right': { bottom: '80px', right: '15px' },
    'center-left': { top: '50%', left: '15px', transform: 'translateY(-50%)' },
    'map-center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  return (
    <div 
      className="compass-container enhanced"
      style={{
        ...positionStyles[currentPosition],
        width: `${size}px`,
        height: `${size}px`
      }}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 120 120"
        className="compass-svg enhanced"
        style={{
          transform: mapRotation ? `rotate(${-mapRotation}deg)` : 'none'
        }}
      >
        {/* Definitions for gradients and effects */}
        <defs>
          {/* Subtle background gradient */}
          <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(15, 23, 42, 0.95)" />
            <stop offset="100%" stopColor="rgba(30, 41, 59, 0.98)" />
          </radialGradient>
          
          {/* North arrow gradient (cyan accent matching your UI) */}
          <linearGradient id="northGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          
          {/* Other arrows gradient */}
          <linearGradient id="cardinalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* Enhanced glow and shadow effects */}
          <filter id="softGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="enhancedGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3"/>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.8)"/>
          </filter>
        </defs>

        {/* Enhanced background with better visibility */}
        <circle 
          cx="60" 
          cy="60" 
          r="55" 
          fill="url(#bgGradient)"
          stroke="rgba(148, 163, 184, 0.4)"
          strokeWidth="1.5"
          filter="url(#enhancedGlow)"
        />
        
        {/* Outer ring marks for 8-point compass */}
        <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth="1" fill="none">
          {/* Cardinal direction lines */}
          <line x1="60" y1="8" x2="60" y2="18" /> {/* N */}
          <line x1="112" y1="60" x2="102" y2="60" /> {/* E */}
          <line x1="60" y1="112" x2="60" y2="102" /> {/* S */}
          <line x1="8" y1="60" x2="18" y2="60" /> {/* W */}
          
          {/* Intercardinal direction marks */}
          <line x1="98.1" y1="21.9" x2="92.4" y2="27.6" /> {/* NE */}
          <line x1="98.1" y1="98.1" x2="92.4" y2="92.4" /> {/* SE */}
          <line x1="21.9" y1="98.1" x2="27.6" y2="92.4" /> {/* SW */}
          <line x1="21.9" y1="21.9" x2="27.6" y2="27.6" /> {/* NW */}
        </g>

        {/* North arrow - Enhanced with better visibility */}
        <path
          d="M 60,12 L 65,45 L 60,40 L 55,45 Z"
          fill="url(#northGrad)"
          stroke="#0e7490"
          strokeWidth="1.2"
          filter="url(#enhancedGlow)"
        />
        
        {/* East arrow */}
        <path
          d="M 108,60 L 75,65 L 80,60 L 75,55 Z"
          fill="url(#cardinalGrad)"
          stroke="#475569"
          strokeWidth="0.8"
        />
        
        {/* South arrow */}
        <path
          d="M 60,108 L 55,75 L 60,80 L 65,75 Z"
          fill="url(#cardinalGrad)"
          stroke="#475569"
          strokeWidth="0.8"
        />
        
        {/* West arrow */}
        <path
          d="M 12,60 L 45,55 L 40,60 L 45,65 Z"
          fill="url(#cardinalGrad)"
          stroke="#475569"
          strokeWidth="0.8"
        />

        {/* Intercardinal arrows - smaller */}
        <path d="M 95.5,24.5 L 75,40 L 78,37 L 80,35 Z" fill="rgba(148, 163, 184, 0.7)" stroke="rgba(100, 116, 139, 0.8)" strokeWidth="0.5" />
        <path d="M 95.5,95.5 L 80,80 L 78,83 L 75,80 Z" fill="rgba(148, 163, 184, 0.7)" stroke="rgba(100, 116, 139, 0.8)" strokeWidth="0.5" />
        <path d="M 24.5,95.5 L 40,75 L 37,78 L 35,80 Z" fill="rgba(148, 163, 184, 0.7)" stroke="rgba(100, 116, 139, 0.8)" strokeWidth="0.5" />
        <path d="M 24.5,24.5 L 35,40 L 37,42 L 40,45 Z" fill="rgba(148, 163, 184, 0.7)" stroke="rgba(100, 116, 139, 0.8)" strokeWidth="0.5" />

        {/* Center circle */}
        <circle cx="60" cy="60" r="4" fill="#0891b2" stroke="#22d3ee" strokeWidth="1" />

        {/* Enhanced cardinal direction labels with text shadows */}
        <text x="60" y="8" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#22d3ee" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">N</text>
        <text x="112" y="64" textAnchor="middle" fontSize="11" fontWeight="600" fill="#cbd5e1" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">E</text>
        <text x="60" y="118" textAnchor="middle" fontSize="11" fontWeight="600" fill="#cbd5e1" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">S</text>
        <text x="8" y="64" textAnchor="middle" fontSize="11" fontWeight="600" fill="#cbd5e1" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">W</text>

        {/* Enhanced intercardinal labels with shadows */}
        <text x="92" y="32" textAnchor="middle" fontSize="8" fill="rgba(203, 213, 225, 0.9)" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">NE</text>
        <text x="92" y="92" textAnchor="middle" fontSize="8" fill="rgba(203, 213, 225, 0.9)" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">SE</text>
        <text x="28" y="92" textAnchor="middle" fontSize="8" fill="rgba(203, 213, 225, 0.9)" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">SW</text>
        <text x="28" y="32" textAnchor="middle" fontSize="8" fill="rgba(203, 213, 225, 0.9)" fontFamily='"Inter", system-ui, sans-serif' filter="url(#textShadow)">NW</text>
      </svg>
    </div>
  );
};

export default CompassRose;
