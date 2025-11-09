import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for handling window resize events with SSR safety
 * Provides window dimensions and responsive breakpoint detection
 */
export const useWindowResize = (breakpoint = 768) => {
  // Safe initial values for SSR
  const getInitialSize = () => {
    if (typeof window === 'undefined') {
      return { width: 1024, height: 768, isMobile: false };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      width,
      height,
      isMobile: width <= breakpoint
    };
  };

  const [windowSize, setWindowSize] = useState(getInitialSize);

  const handleResize = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setWindowSize({
      width,
      height,
      isMobile: width <= breakpoint
    });
  }, [breakpoint]);

  useEffect(() => {
    // Skip in SSR environment
    if (typeof window === 'undefined') return;

    // Set initial size on mount (handles hydration)
    handleResize();

    // Add resize listener
    window.addEventListener('resize', handleResize, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return windowSize;
};

/**
 * Hook for responsive panel collapse state
 * Automatically collapses panel based on window size
 */
export const useResponsiveCollapse = (breakpoint = 768, initialCollapsed = false) => {
  const { width, isMobile } = useWindowResize(breakpoint);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // SSR-safe initial state
    if (typeof window === 'undefined') return initialCollapsed;
    return window.innerWidth <= breakpoint;
  });

  // Auto-collapse based on window size
  useEffect(() => {
    setIsCollapsed(isMobile);
  }, [isMobile]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  return {
    isCollapsed,
    setIsCollapsed,
    toggleCollapse,
    windowWidth: width,
    isMobile
  };
};