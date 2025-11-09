import { useState, useEffect, useCallback } from 'react';

/**
 * World-class legend state management hook
 * Features: Progressive disclosure, accessibility, performance optimization
 */
export const useLegendState = (autoCollapseDelay = 5000) => {
  // Progressive disclosure state
  const [isExpanded, setIsExpanded] = useState(() => {
    // Restore user preference from localStorage
    const saved = localStorage.getItem('legend-expanded');
    return saved ? JSON.parse(saved) : false;
  });

  // Animation state for smooth transitions
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Auto-collapse timer
  const [autoCollapseTimer, setAutoCollapseTimer] = useState(null);

  // Persist user preference
  useEffect(() => {
    localStorage.setItem('legend-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // Toggle with accessibility support
  const toggleExpanded = useCallback((event) => {
    // Support keyboard navigation
    if (event && event.type === 'keydown' && !['Enter', ' '].includes(event.key)) {
      return;
    }
    
    setIsAnimating(true);
    setIsExpanded(prev => !prev);
    
    // Clear auto-collapse timer when user interacts
    if (autoCollapseTimer) {
      clearTimeout(autoCollapseTimer);
      setAutoCollapseTimer(null);
    }
    
    // Reset animation state
    setTimeout(() => setIsAnimating(false), 300);
  }, [autoCollapseTimer]);

  // Force collapse (for Escape key or programmatic control)
  const forceCollapse = useCallback(() => {
    if (isExpanded) {
      setIsAnimating(true);
      setIsExpanded(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isExpanded]);

  // Auto-collapse functionality (optional)
  useEffect(() => {
    if (isExpanded && autoCollapseDelay > 0) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
      }, autoCollapseDelay);
      
      setAutoCollapseTimer(timer);
      
      return () => clearTimeout(timer);
    }
  }, [isExpanded, autoCollapseDelay]);

  // Keyboard event handler for accessibility
  const keyboardHandler = useCallback((event) => {
    switch (event.key) {
      case 'Escape':
        forceCollapse();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleExpanded(event);
        break;
      default:
        break;
    }
  }, [toggleExpanded, forceCollapse]);

  return {
    isExpanded,
    isAnimating,
    toggleExpanded,
    forceCollapse,
    keyboardHandler,
    // Accessibility props
    ariaProps: {
      'aria-expanded': isExpanded,
      'aria-label': isExpanded ? 'Collapse legend details' : 'Expand legend details',
      'role': 'button',
      'tabIndex': 0
    }
  };
};