/**
 * Bottom Canvas Manager
 * 
 * Manages the bottom canvas UI state and data updates with proper
 * separation from map interaction logic.
 * 
 * Responsibilities:
 * - Canvas show/hide state
 * - Data loading states
 * - Error state handling
 * - Optimistic UI updates
 */

class BottomCanvasManager {
  constructor(setBottomCanvasData, setShowBottomCanvas) {
    this.setBottomCanvasData = setBottomCanvasData;
    this.setShowBottomCanvas = setShowBottomCanvas;
  }
  
  /**
   * Show loading state immediately for better UX
   * @param {Object} loadingData - Initial data to show while loading
   */
  showLoadingState(loadingData) {
    this.setBottomCanvasData(loadingData);
    this.setShowBottomCanvas(true);
  }
  
  /**
   * Update with successful data
   * @param {Object} data - The data to display
   */
  showSuccessState(data) {
    this.setBottomCanvasData(data);
    this.setShowBottomCanvas(true);
  }
  
  /**
   * Show error state
   * @param {Object} errorData - Error data to display
   */
  showErrorState(errorData) {
    this.setBottomCanvasData(errorData);
    this.setShowBottomCanvas(true);
  }
  
  /**
   * Hide the canvas
   */
  hide() {
    this.setShowBottomCanvas(false);
  }
  
  /**
   * Handle async data loading with proper state management
   * @param {Object} initialData - Initial data to show
   * @param {Promise} dataPromise - Promise that resolves to final data
   */
  async handleAsyncData(initialData, dataPromise) {
    // Show loading state immediately
    this.showLoadingState(initialData);
    
    try {
      const finalData = await dataPromise;
      this.showSuccessState(finalData);
      return finalData;
    } catch (error) {
      const errorData = {
        ...initialData,
        featureInfo: "Error loading data",
        status: "error",
        error: error.message
      };
      this.showErrorState(errorData);
      throw error;
    }
  }
}

export default BottomCanvasManager;