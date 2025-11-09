// useMapStatePersistence.js - Simple map state persistence hook

import { useCallback } from 'react';

const useMapStatePersistence = () => {
  // Simple URL updater for map state
  const updateUrl = useCallback((state) => {
    // Update URL with current state
    const params = new URLSearchParams(window.location.search);
    
    if (state) {
      // Update parameters based on state
      Object.entries(state).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.set(key, value.toString());
        }
      });
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  return { updateUrl };
};

export default useMapStatePersistence;