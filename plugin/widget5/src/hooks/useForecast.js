/**
 * Modern useForecast Hook
 * 
 * This file exports the composed hook which uses proper service abstractions
 * to separate concerns and improve maintainability.
 * 
 * Service Architecture:
 * - WMSLayerConfigService: Handles layer configuration cloning and business rules
 * - LayerCollectionManager: Manages layer collections with immutable operations  
 * - useTimeAnimation: Handles time-based animation and slider functionality
 * - useUIState: Manages UI state (canvas visibility, drag state, responsive layout)
 * - useWMSCapabilities: Fetches and parses WMS capabilities
 * - useMapRendering: Handles Leaflet map integration and layer rendering
 * - useLegendManagement: Manages legend rendering and image loading
 * 
 * Benefits of this architecture:
 * - Clear separation of concerns
 * - Testable service classes  
 * - Immutable operations
 * - No direct window/DOM access in business logic
 * - Proper error handling and validation
 * - Clear invariants and contracts
 */

// Export the modern composed hook
export { useForecast } from './useForecastComposed';

// Export service classes for direct use if needed
export { default as WMSLayerConfigService } from '../services/WMSLayerConfigService';
export { default as LayerCollectionManager } from '../services/LayerCollectionManager';
