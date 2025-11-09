import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for handling drag and drop functionality with proper cleanup
 * Provides drag state management and event handling
 */
export const useDragController = (initialPosition = { x: 24, y: 80 }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Use refs to avoid stale closures in event handlers
  const positionRef = useRef(position);
  const dragOffsetRef = useRef(dragOffset);
  const isDraggingRef = useRef(isDragging);

  // Update refs when state changes
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    dragOffsetRef.current = dragOffset;
  }, [dragOffset]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Mouse/touch event handlers
  const handleMouseMove = useCallback((event) => {
    if (!isDraggingRef.current) return;

    event.preventDefault();
    
    const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0;
    const clientY = event.clientY || (event.touches && event.touches[0]?.clientY) || 0;

    const newPosition = {
      x: clientX - dragOffsetRef.current.x,
      y: clientY - dragOffsetRef.current.y
    };

    // Constrain to viewport if window is available
    if (typeof window !== 'undefined') {
      const maxX = window.innerWidth - 200; // Assume element width ~200px
      const maxY = window.innerHeight - 100; // Assume element height ~100px
      
      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));
    }

    setPosition(newPosition);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Start drag handler
  const startDrag = useCallback((event, customOffset) => {
    event.preventDefault();
    
    const clientX = event.clientX || (event.touches && event.touches[0]?.clientX) || 0;
    const clientY = event.clientY || (event.touches && event.touches[0]?.clientY) || 0;

    const offset = customOffset || {
      x: clientX - positionRef.current.x,
      y: clientY - positionRef.current.y
    };

    setDragOffset(offset);
    setIsDragging(true);
  }, []);

  // Stop drag handler
  const stopDrag = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Set up global event listeners when dragging
  useEffect(() => {
    if (!isDragging || typeof window === 'undefined') return;

    // Add event listeners to document for better drag experience
    const handleMouseMoveGlobal = (e) => handleMouseMove(e);
    const handleMouseUpGlobal = (e) => handleMouseUp(e);

    document.addEventListener('mousemove', handleMouseMoveGlobal, { passive: false });
    document.addEventListener('mouseup', handleMouseUpGlobal);
    document.addEventListener('touchmove', handleMouseMoveGlobal, { passive: false });
    document.addEventListener('touchend', handleMouseUpGlobal);

    // Cleanup function
    return () => {
      document.removeEventListener('mousemove', handleMouseMoveGlobal);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('touchmove', handleMouseMoveGlobal);
      document.removeEventListener('touchend', handleMouseUpGlobal);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset position
  const resetPosition = useCallback(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  return {
    position,
    setPosition,
    isDragging,
    dragOffset,
    startDrag,
    stopDrag,
    resetPosition,
    
    // Event handlers for manual attachment if needed
    handleMouseMove,
    handleMouseUp
  };
};