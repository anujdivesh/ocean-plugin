/**
 * useInundationPoints Hook
 *
 * React hook for managing inundation forecast points on the map
 * Provides easy integration with InundationPointsService
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import InundationPointsService from '../services/InundationPointsService';

export const useInundationPoints = (mapInstance, options = {}) => {
  const serviceRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [isVisible, setIsVisible] = useState(options.defaultVisible !== false);
  const pendingLoadRef = useRef(false); // Track if load is pending map initialization
  const optionsRef = useRef(options);

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new InundationPointsService({
        debugMode: options.debugMode || false
      });
    }
  }, [options.debugMode]);

  // Keep latest options available without re-creating callbacks
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  
  // Load points function - DEFINED BEFORE map initialization useEffect
  const loadPoints = useCallback(async (loadOptions = {}) => {
    console.log('🌊 InundationPoints: loadPoints called', { 
      hasService: !!serviceRef.current,
      hasMapInstance: !!serviceRef.current?.mapInstance,
      mapLoaded: !!serviceRef.current?.mapInstance?._loaded,
      loadOptions 
    });

    if (!serviceRef.current) {
      console.error('InundationPoints: Service not initialized');
      return;
    }

    // Check if service has map and map is loaded (don't rely on mapReady state)
    if (!serviceRef.current.mapInstance) {
      console.warn('InundationPoints: Map not initialized in service yet');
      pendingLoadRef.current = true;
      setError('Map not ready yet, will load when ready');
      return;
    }

    if (!serviceRef.current.mapInstance._loaded) {
      console.warn('InundationPoints: Map exists but not loaded yet, deferring');
      pendingLoadRef.current = true;
      setError('Map not ready yet, will load when ready');
      return;
    }
    
    console.log('🚀 InundationPoints: Starting fetch...');
    setIsLoading(true);
    setError(null);

    try {
      const result = await serviceRef.current.loadAndDisplayPoints({
        ...optionsRef.current,
        ...loadOptions
      });

      console.log('✅ InundationPoints: Load successful', result);

      const serviceStats = serviceRef.current.getStats
        ? serviceRef.current.getStats()
        : null;
      const combinedStats = {
        ...(serviceStats || {}),
        ...(result || {})
      };

      setStats(combinedStats);
      setIsLoading(false);
      pendingLoadRef.current = false;
      return combinedStats;
    } catch (err) {
      console.error('❌ InundationPoints: Failed to load:', err);
      setError(err.message || 'Failed to load data');
      setIsLoading(false);
      pendingLoadRef.current = false;
      throw err;
    }
  }, []); // No dependencies - always use latest serviceRef
  
  // Initialize with map instance - AFTER loadPoints is defined
  useEffect(() => {
    const map = mapInstance?.current;
    if (!map || !serviceRef.current) return;
    
    // Wait for map to be fully loaded before initializing
    const initializeWhenReady = () => {
      if (map._loaded) {
        console.log('🗺️ Map already loaded, initializing service immediately');
        serviceRef.current.initialize(map);
        
        // If there was a pending load request, execute it now
        if (pendingLoadRef.current && isVisible) {
          console.log('📥 Executing pending load request');
          pendingLoadRef.current = false;
          loadPoints();
        }
      } else {
        console.log('⏳ Map not loaded yet, waiting for ready event...');
        // Map not ready yet, wait for load event
        map.whenReady(() => {
          console.log('🗺️ Map ready event fired, initializing service');
          serviceRef.current.initialize(map);
          
          // If there was a pending load request, execute it now
          if (pendingLoadRef.current && isVisible) {
            console.log('📥 Executing pending load request');
            pendingLoadRef.current = false;
            loadPoints();
          }
        });
      }
    };
    
    initializeWhenReady();
    
    return () => {
      if (serviceRef.current) {
        serviceRef.current.cleanup();
      }
    };
  }, [mapInstance, isVisible, loadPoints]);
  
  // Clear points function
  const clearPoints = () => {
    if (serviceRef.current) {
      serviceRef.current.clearPoints();
      setStats(null);
    }
  };
  
  // Toggle visibility
  const toggleVisibility = useCallback(() => {
    try {
      if (!serviceRef.current) {
        console.warn('InundationPoints: Service not initialized yet');
        return;
      }
      
      // Use functional setState to get current value
      setIsVisible(prev => {
        const newVisible = !prev;
        console.log('� toggleVisibility: Changing from', prev, 'to', newVisible);
        
        // Check if map is ready using actual map state
        if (!serviceRef.current.mapInstance || !serviceRef.current.mapInstance._loaded) {
          console.warn('InundationPoints: Map not ready yet, visibility will be applied when map initializes');
          if (newVisible) {
            pendingLoadRef.current = true; // Mark as pending
          }
          return newVisible;
        }
        
        if (newVisible) {
          // When showing, load points
          console.log('✅ Visibility is now true, will load points in useEffect');
          // Let the useEffect handle the actual loading
        } else {
          // When hiding, hide the layer immediately
          console.log('❌ Hiding layer');
          serviceRef.current.setVisible(false);
        }
        
        return newVisible;
      });
    } catch (err) {
      console.error('💥 Error in toggleVisibility:', err);
      throw err;
    }
  }, []); // Empty deps - uses functional setState and serviceRef
  
  // Auto-load points when visibility becomes true
  useEffect(() => {
    if (isVisible && serviceRef.current?.mapInstance?._loaded) {
      console.log('🌊 isVisible became true, loading points...');
      loadPoints().catch(err => {
        console.error('💥 Failed to auto-load points:', err);
      });
    }
  }, [isVisible, loadPoints]);
  
  // Get current statistics
  const getStats = () => {
    if (serviceRef.current) {
      return serviceRef.current.getStats();
    }
    return null;
  };
  
  return {
    loadPoints,
    clearPoints,
    toggleVisibility,
    getStats,
    isLoading,
    error,
    stats,
    isVisible,
    service: serviceRef.current
  };
};

export default useInundationPoints;
