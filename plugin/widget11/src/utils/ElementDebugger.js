/**
 * ElementDebugger - Browser Console Utility
 * 
 * Helps debug element dimensions and visibility issues in the application.
 * Use this in the browser console to diagnose rendering problems.
 * 
 * Usage:
 *   1. Open browser console (F12)
 *   2. Copy and paste this entire script
 *   3. Run: debugInundationElements()
 */

let logElementDimensions;
let debugInundationElements;
let watchForInundationPoints;
let checkReactState;
let clickInundationButton;
let checkNetworkRequests;

const existingTools = (typeof window !== 'undefined' && window.__INUNDATION_DEBUG_TOOLS__)
    ? window.__INUNDATION_DEBUG_TOOLS__
    : null;

if (existingTools) {
    logElementDimensions = existingTools.logDimensions;
    debugInundationElements = existingTools.checkElements;
    watchForInundationPoints = existingTools.watchPoints;
    checkReactState = existingTools.checkReact;
    clickInundationButton = existingTools.clickButton;
    checkNetworkRequests = existingTools.checkNetwork;
} else {
    // Function to log dimensions of an element
    logElementDimensions = (selector, description = '') => {
        const element = document.querySelector(selector);
        
        if (element) {
            const rect = element.getBoundingClientRect();
            const computed = window.getComputedStyle(element);
            
            console.log(`✅ ${description || selector} FOUND:`);
            console.log(`   📏 Dimensions: ${element.offsetWidth}px × ${element.offsetHeight}px`);
            console.log(`   📍 Position: top=${rect.top}px, left=${rect.left}px`);
            console.log(`   👁️ Visibility: ${computed.visibility}, Display: ${computed.display}`);
            console.log(`   🎨 Z-index: ${computed.zIndex}`);
            console.log(`   📦 Element:`, element);
            return element;
        } else {
            console.error(`❌ ${description || selector} NOT FOUND`);
            return null;
        }
    };

    // Function to check all inundation-related elements
    debugInundationElements = () => {
        console.log('🔍 === INUNDATION POINTS DEBUG REPORT ===\n');
        
        // Check main map container
        console.log('1️⃣ CHECKING MAP CONTAINER:');
        const map = logElementDimensions('#map', 'Map Container');
        
        // Check if Leaflet map exists
        if (map && map._leaflet_id) {
            console.log('   ✅ Leaflet map initialized (ID: ' + map._leaflet_id + ')');
        } else {
            console.log('   ❌ Leaflet map NOT initialized');
        }
        console.log('');
        
        // Check inundation control button
        console.log('2️⃣ CHECKING INUNDATION CONTROL:');
        const control = logElementDimensions('.inundation-control', 'Inundation Control');
        logElementDimensions('.inundation-toggle', 'Toggle Button');
        console.log('');
        
        // Check for inundation markers
        console.log('3️⃣ CHECKING INUNDATION MARKERS:');
        const markers = document.querySelectorAll('.inundation-point-icon');
        console.log(`   📍 Found ${markers.length} inundation point markers`);
        
        if (markers.length > 0) {
            console.log(`   ✅ INUNDATION POINTS ARE VISIBLE!`);
            console.log(`   Sample marker:`, markers[0]);
        } else {
            console.log(`   ❌ NO INUNDATION POINTS VISIBLE`);
            console.log(`   💡 Try clicking "Show Inundation" button`);
        }
        console.log('');
        
        // Check for Leaflet layers
        console.log('4️⃣ CHECKING LEAFLET LAYERS:');
        const panes = document.querySelectorAll('.leaflet-pane');
        console.log(`   Found ${panes.length} Leaflet panes`);
        
        const markerPane = document.querySelector('.leaflet-marker-pane');
        if (markerPane) {
            const allMarkers = markerPane.querySelectorAll('.leaflet-marker-icon');
            console.log(`   📍 Total markers in marker pane: ${allMarkers.length}`);
        }
        console.log('');
        
        // Check for layer groups
        console.log('5️⃣ CHECKING LAYER GROUPS:');
        const layerGroups = document.querySelectorAll('.leaflet-layer');
        console.log(`   Found ${layerGroups.length} Leaflet layers`);
        console.log('');
        
        // Network check
        console.log('6️⃣ NETWORK STATUS:');
        console.log(`   Online: ${navigator.onLine ? '✅ Yes' : '❌ No'}`);
        console.log('');
        
        // Summary
        console.log('📊 === SUMMARY ===');
        if (markers.length > 0) {
            console.log('✅ Inundation points are rendering correctly!');
            console.log(`   ${markers.length} points visible on map`);
        } else if (!map) {
            console.log('❌ Map container not found - page may not be loaded');
        } else if (!map._leaflet_id) {
            console.log('❌ Leaflet map not initialized - wait for page load');
        } else if (!control) {
            console.log('❌ Inundation control not found - component may not be mounted');
        } else {
            console.log('⚠️ Map is ready but no points visible');
            console.log('   Try: Click "Show Inundation" button in top-right corner');
        }
        console.log('\n=== END DEBUG REPORT ===\n');
    };

    // Function to watch for dynamic element loading
    watchForInundationPoints = (timeout = 10000) => {
        console.log('👀 Watching for inundation points to appear...');
        const startTime = Date.now();
        let pollInterval;
        
        const observer = new MutationObserver(() => {
            const markers = document.querySelectorAll('.inundation-point-icon');
            if (markers.length > 0) {
                const elapsed = Date.now() - startTime;
                console.log(`✅ INUNDATION POINTS APPEARED! (after ${elapsed}ms)`);
                console.log(`   Found ${markers.length} markers`);
                observer.disconnect();
                if (pollInterval) {
                    clearInterval(pollInterval);
                }
            }
        });
        
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        // Polling fallback
        pollInterval = setInterval(() => {
            const markers = document.querySelectorAll('.inundation-point-icon');
            if (markers.length > 0) {
                const elapsed = Date.now() - startTime;
                console.log(`✅ INUNDATION POINTS APPEARED! (via polling after ${elapsed}ms)`);
                console.log(`   Found ${markers.length} markers`);
                observer.disconnect();
                clearInterval(pollInterval);
            }
            
            // Timeout check
            if (Date.now() - startTime > timeout) {
                console.log(`⏱️ Timeout reached (${timeout}ms) - no points appeared`);
                console.log(`   💡 Try manually clicking "Show Inundation" button`);
                observer.disconnect();
                clearInterval(pollInterval);
            }
        }, 500);
    };

    // Function to check React component state (if accessible)
    checkReactState = () => {
        console.log('⚛️ Checking React component state...');
        
        const mapElement = document.querySelector('#map');
        if (mapElement) {
            const reactKey = Object.keys(mapElement).find(key => 
                key.startsWith('__reactInternalInstance') || 
                key.startsWith('__reactFiber')
            );
            
            if (reactKey) {
                console.log('   ✅ React component found');
                // Don't log the actual state as it can be huge
                console.log('   💡 React DevTools recommended for state inspection');
            } else {
                console.log('   ⚠️ React component key not found');
            }
        }
    };

    // Function to simulate clicking the inundation button
    clickInundationButton = () => {
        const button = document.querySelector('.inundation-toggle');
        if (button) {
            console.log('🖱️ Clicking inundation toggle button...');
            button.click();
            
            // Wait and check results
            setTimeout(() => {
                const markers = document.querySelectorAll('.inundation-point-icon');
                if (markers.length > 0) {
                    console.log(`✅ Success! ${markers.length} points now visible`);
                } else {
                    console.log('⚠️ Button clicked but no points appeared yet');
                    console.log('   Check browser console for errors');
                }
            }, 2000);
        } else {
            console.error('❌ Inundation toggle button not found');
            console.log('   Button selector: .inundation-toggle');
        }
    };

    // Function to check network requests
    checkNetworkRequests = () => {
        console.log('🌐 Checking network requests...');
        console.log('   Open Network tab and filter for "final.json"');
        console.log('   Expected URL: https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json');
        console.log('   Or (dev): /api/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/final.json');
    };

    if (typeof window !== 'undefined') {
        window.debugInundation = {
            checkElements: debugInundationElements,
            watchPoints: watchForInundationPoints,
            checkReact: checkReactState,
            clickButton: clickInundationButton,
            checkNetwork: checkNetworkRequests,
            logDimensions: logElementDimensions
        };

        window.__INUNDATION_DEBUG_TOOLS__ = {
            checkElements: debugInundationElements,
            watchPoints: watchForInundationPoints,
            checkReact: checkReactState,
            clickButton: clickInundationButton,
            checkNetwork: checkNetworkRequests,
            logDimensions: logElementDimensions
        };
        
        console.log('🔧 Inundation Debug Tools Loaded!');
        console.log('   Available commands:');
        console.log('   • debugInundation.checkElements()   - Full diagnostic report');
        console.log('   • debugInundation.watchPoints()     - Watch for points to appear');
        console.log('   • debugInundation.clickButton()     - Auto-click Show button');
        console.log('   • debugInundation.checkNetwork()    - Check network requests');
        console.log('   • debugInundation.checkReact()      - Check React state');
        console.log('');
        console.log('   Quick start: debugInundation.checkElements()');
    }

    // Auto-run on script load if in browser
    if (typeof window !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM loaded - run debugInundation.checkElements() to diagnose');
        });
    }
}

if (typeof window !== 'undefined' && existingTools) {
    window.debugInundation = existingTools;
}

export {
    logElementDimensions,
    debugInundationElements,
    watchForInundationPoints,
    checkReactState,
    clickInundationButton,
    checkNetworkRequests
};

export default {
    debugInundationElements,
    watchForInundationPoints,
    checkReactState,
    clickInundationButton,
    checkNetworkRequests,
    logElementDimensions
};
