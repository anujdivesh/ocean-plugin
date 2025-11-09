import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for safe DOM operations with SSR compatibility
 * Provides utilities for DOM manipulation with proper cleanup
 */
export const useSafeDOM = () => {
  const isClient = typeof window !== 'undefined';
  
  return {
    isClient,
    window: isClient ? window : null,
    document: isClient ? document : null
  };
};

/**
 * Hook for managing event listeners with automatic cleanup
 * Prevents memory leaks and handles SSR gracefully
 */
export const useEventListener = (eventName, handler, element, options) => {
  const savedHandler = useRef(handler);
  const { isClient } = useSafeDOM();

  // Update ref with latest handler
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!isClient) return;

    // Define the listening element
    const targetElement = element?.current || element || window;
    if (!targetElement || !targetElement.addEventListener) return;

    // Create event listener that calls handler function stored in ref
    const eventListener = (event) => savedHandler.current(event);

    // Add event listener
    targetElement.addEventListener(eventName, eventListener, options);

    // Remove event listener on cleanup
    return () => {
      targetElement.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, isClient, options]);
};

/**
 * Hook for managing multiple event listeners on the same element
 */
export const useMultipleEventListeners = (events, element, options) => {
  const { isClient } = useSafeDOM();

  useEffect(() => {
    if (!isClient || !events || events.length === 0) return;

    const targetElement = element?.current || element || window;
    if (!targetElement || !targetElement.addEventListener) return;

    // Add all event listeners
    const cleanupFunctions = events.map(({ eventName, handler }) => {
      const eventListener = (event) => handler(event);
      targetElement.addEventListener(eventName, eventListener, options);
      
      return () => {
        targetElement.removeEventListener(eventName, eventListener, options);
      };
    });

    // Return cleanup function that removes all listeners
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [events, element, isClient, options]);
};

/**
 * Hook for safe document/window property access
 */
export const useClientRect = (elementRef) => {
  const { isClient } = useSafeDOM();
  
  const getRect = useCallback(() => {
    if (!isClient || !elementRef?.current) {
      return { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
    }
    
    return elementRef.current.getBoundingClientRect();
  }, [isClient, elementRef]);

  return getRect;
};