import { useState, useEffect } from 'react';

/**
 * Hook for tracking window dimensions with SSR-safe initialization
 * Handles window resize events and provides current dimensions
 */
export const useWindowSize = () => {
  // Initialize with undefined to detect client-side rendering
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    let timeoutId;
    
    // Debounced handler to call on window resize
    function handleResize() {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Set window width/height to state
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150); // Debounce for 150ms
    }

    // Add passive event listener for better performance
    window.addEventListener('resize', handleResize, { passive: true });

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty array ensures that effect is only run on mount

  return windowSize;
};

/**
 * Hook for responsive UI state based on window size
 * Provides breakpoint-based boolean flags for responsive behavior
 */
export const useResponsiveUI = () => {
  const { width } = useWindowSize();
  
  return {
    isMobile: width !== undefined && width <= 768,
    isTablet: width !== undefined && width > 768 && width <= 1024,
    isDesktop: width !== undefined && width > 1024,
    width,
    // SSR-safe check
    isClient: width !== undefined,
  };
};