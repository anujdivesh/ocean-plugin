import { useState } from 'react';
import { useResponsiveUI } from './useWindowSize';
import { useDragController } from './useDragController';

/**
 * Hook for managing UI state (canvas visibility, drag state, responsive layout)
 * Separates UI concerns from data/map logic with proper SSR safety
 */
export const useUIState = () => {
  // Canvas and modal states
  const [showBuoyCanvas, setShowBuoyCanvas] = useState(false);
  const [showBottomCanvas, setShowBottomCanvas] = useState(false);
  const [bottomCanvasData, setBottomCanvasData] = useState(null);
  const [selectedBuoyId, setSelectedBuoyId] = useState(null);
  
  // Responsive layout handling (SSR-safe)
  const { isMobile, isClient } = useResponsiveUI();
  const [useModernUI, setUseModernUI] = useState(true);
  const [modernPanelCollapsed, setModernPanelCollapsed] = useState(false);
  
  // Update collapsed state based on responsive breakpoints
  // Only update if we're on the client side to avoid hydration mismatches
  if (isClient && modernPanelCollapsed !== isMobile) {
    setModernPanelCollapsed(isMobile);
  }
  
  // Drag functionality (with proper cleanup)
  const dragController = useDragController({ x: 24, y: 80 });
  
  // Visualization states
  const [wmsOpacity, setWmsOpacity] = useState(1);
  const [isUpdatingVisualization, setIsUpdatingVisualization] = useState(false);

  // Canvas control functions
  const openBottomCanvas = (data) => {
    setBottomCanvasData(data);
    setShowBottomCanvas(true);
  };

  const closeBottomCanvas = () => {
    setShowBottomCanvas(false);
    setBottomCanvasData(null);
  };

  const openBuoyCanvas = (buoyId) => {
    setSelectedBuoyId(buoyId);
    setShowBuoyCanvas(true);
  };

  const closeBuoyCanvas = () => {
    setShowBuoyCanvas(false);
    setSelectedBuoyId(null);
  };

  return {
    // Canvas states
    showBuoyCanvas,
    setShowBuoyCanvas,
    showBottomCanvas,
    setShowBottomCanvas,
    bottomCanvasData,
    setBottomCanvasData,
    selectedBuoyId,
    setSelectedBuoyId,
    
    // Drag states (from dragController)
    sidebarPosition: dragController.position,
    setSidebarPosition: dragController.setPosition,
    isDragging: dragController.isDragging,
    dragOffset: dragController.dragOffset,
    dragElementRef: dragController.dragElementRef,
    handleDragStart: dragController.handleDragStart,
    
    // UI preferences (SSR-safe)
    useModernUI,
    setUseModernUI,
    modernPanelCollapsed,
    setModernPanelCollapsed,
    isMobile,
    isClient,
    
    // Visualization states
    wmsOpacity,
    setWmsOpacity,
    isUpdatingVisualization,
    setIsUpdatingVisualization,
    
    // Control functions
    openBottomCanvas,
    closeBottomCanvas,
    openBuoyCanvas,
    closeBuoyCanvas,
    resetDragPosition: dragController.resetPosition
  };
};