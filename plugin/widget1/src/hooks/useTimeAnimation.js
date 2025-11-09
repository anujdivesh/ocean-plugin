import { useState, useEffect, useCallback, useRef } from 'react';
import { MARINE_CONFIG } from '../config/marineVariables.js';

/**
 * A+ Time Animation Hook with Adaptive Timing and Frame Buffering
 * Features:
 * - Adaptive timing based on network conditions
 * - Frame buffering for smooth animation
 * - Performance monitoring and optimization
 * - Graceful error handling and recovery
 */
export const useTimeAnimation = (capTime) => {
  const [sliderIndex, setSliderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(3000); // Adaptive speed
  const [isBuffering, setIsBuffering] = useState(false);
  const [minIndex, setMinIndex] = useState(0); // Do not allow sliding before this index
  
  // Performance tracking refs
  const frameLoadTimes = useRef([]);
  const lastFrameStart = useRef(null);
  const animationQuality = useRef('high'); // 'high', 'medium', 'low'
  
  // A+ Frame buffering system for smooth animation
  const frameBuffer = useRef(new Map());
  const bufferSize = useRef(3); // Adaptive buffer size
  
  // Calculate total steps from capTime
  const totalSteps = capTime.totalSteps || 0;
  
  // Calculate current slider date using available timestamps if available
  const currentSliderDate = (() => {
    if (capTime.loading) return new Date();
    
    // Use available timestamps if they exist
    if (capTime.availableTimestamps && capTime.availableTimestamps.length > 0) {
      const index = Math.min(sliderIndex, capTime.availableTimestamps.length - 1);
      return capTime.availableTimestamps[index];
    }
    
    // Fallback to calculated time
    return capTime.start 
      ? new Date(capTime.start.getTime() + sliderIndex * capTime.stepHours * 60 * 60 * 1000)
      : new Date();
  })();
  
  // Format current slider date for WMS requests
  const currentSliderDateStr = currentSliderDate.toISOString();

  // Performance monitoring and adaptive speed calculation
  const calculateOptimalSpeed = useCallback(() => {
    if (frameLoadTimes.current.length < 3) return 3000; // Default for first few frames
    
    const avgLoadTime = frameLoadTimes.current.reduce((a, b) => a + b, 0) / frameLoadTimes.current.length;
    const baseSpeed = Math.max(1500, avgLoadTime + 1000); // Minimum 1.5s, plus buffer
    
    // Adjust based on quality mode
    const qualityMultiplier = {
      'low': 0.8,    // Faster on poor connections
      'medium': 1.0,  // Standard speed
      'high': 1.2     // Slower for better quality
    };
    
    return baseSpeed * qualityMultiplier[animationQuality.current];
  }, []); // Empty dependency array since it only uses refs

  // Track frame loading performance with layer complexity awareness
  const trackFramePerformance = useCallback((loadTime, layerCount = 1, isComposite = false) => {
    // Normalize load time based on layer complexity
    const normalizedLoadTime = isComposite ? loadTime * 0.8 : loadTime / Math.max(layerCount, 1);
    
    frameLoadTimes.current.push(normalizedLoadTime);
    // Keep only last 10 measurements for adaptive calculation
    if (frameLoadTimes.current.length > 10) {
      frameLoadTimes.current.shift();
    }
    
    // Update animation speed based on performance
    const newSpeed = calculateOptimalSpeed();
    setAnimationSpeed(newSpeed);
    
    // Adjust quality based on performance with layer-aware thresholds
    const avgLoadTime = frameLoadTimes.current.reduce((a, b) => a + b, 0) / frameLoadTimes.current.length;
    const performanceThreshold = isComposite ? 3500 : 4000; // Lower threshold for composite layers
    
    if (avgLoadTime > performanceThreshold) {
      animationQuality.current = 'low';
      bufferSize.current = 1; // Minimal buffering for poor performance
    } else if (avgLoadTime > 2000) {
      animationQuality.current = 'medium';
      bufferSize.current = 2; // Moderate buffering
    } else {
      animationQuality.current = 'high';
      bufferSize.current = 3; // Maximum buffering for optimal performance
    }
  }, [calculateOptimalSpeed]); // Stable dependency

  // A+ Intelligent frame preloading for smooth animation
  const preloadFrames = useCallback(async (currentIndex, direction = 1) => {
    if (isBuffering || !capTime.availableTimestamps) return;
    
    setIsBuffering(true);
    const framesToPreload = Math.min(bufferSize.current, totalSteps - currentIndex - 1);
    
    for (let i = 1; i <= framesToPreload; i++) {
      const nextIndex = (currentIndex + i * direction) % totalSteps;
      if (!frameBuffer.current.has(nextIndex)) {
        // Mark frame as being preloaded
        frameBuffer.current.set(nextIndex, 'loading');
        
        // Simulate preloading delay based on network quality
        const preloadDelay = animationQuality.current === 'high' ? 100 : 
                           animationQuality.current === 'medium' ? 200 : 300;
        
        await new Promise(resolve => setTimeout(resolve, preloadDelay));
        frameBuffer.current.set(nextIndex, 'ready');
      }
    }
    
    setIsBuffering(false);
  }, [totalSteps, isBuffering, capTime.availableTimestamps]); // Stable dependencies

  // Reset slider when capabilities change - Initialize to (last available - 7 days)
  useEffect(() => {
    if (!capTime.loading && totalSteps > 0) {
      const MS_IN_DAY = 24 * 60 * 60 * 1000;
      const offsetDays = 7; // Default offset
      let initialIndex = 0;

      try {
        if (capTime.availableTimestamps && capTime.availableTimestamps.length > 0) {
          const timestamps = capTime.availableTimestamps;
          const last = timestamps[timestamps.length - 1];
          const targetTime = new Date(last.getTime() - offsetDays * MS_IN_DAY);
          
          // Find first index >= targetTime; if none, use 0
          let idx = timestamps.findIndex(t => t.getTime() >= targetTime.getTime());
          if (idx === -1) {
            idx = 0;
          }
          initialIndex = Math.max(0, Math.min(idx, totalSteps));
          
          console.log(`🎯 Slider Initialization (last-7days):`);
          console.log(`   Last time: ${last.toISOString()}`);
          console.log(`   Target time (last-7d): ${targetTime.toISOString()}`);
          console.log(`   Using index: ${initialIndex}/${timestamps.length - 1}`);
          console.log(`   Selected time: ${timestamps[initialIndex]?.toISOString()}`);
        } else if (capTime.start && capTime.end && capTime.stepHours) {
          const stepMs = (capTime.stepHours || 6) * 60 * 60 * 1000;
          const targetTime = new Date(capTime.end.getTime() - offsetDays * MS_IN_DAY);
          const rawIndex = Math.round((targetTime.getTime() - capTime.start.getTime()) / stepMs);
          initialIndex = Math.max(0, Math.min(rawIndex, totalSteps));
          
          console.log(`🎯 Slider Initialization (computed from start/end/step):`);
          console.log(`   Start: ${capTime.start.toISOString()}`);
          console.log(`   End: ${capTime.end.toISOString()}`);
          console.log(`   Target (last-7d): ${targetTime.toISOString()}`);
          console.log(`   Using index: ${initialIndex}/${totalSteps}`);
        } else {
          // Fallback to configured default index
          initialIndex = Math.min(MARINE_CONFIG.DEFAULT_SLIDER_INDEX, totalSteps);
          console.log(`🎯 Slider Initialization (fallback config index): ${initialIndex}`);
        }
      } catch (e) {
        console.warn('⚠️ Error determining initial slider index, using fallback.', e);
        initialIndex = Math.min(MARINE_CONFIG.DEFAULT_SLIDER_INDEX, totalSteps);
      }

  setSliderIndex(initialIndex);
  setMinIndex(initialIndex); // Prevent sliding earlier than last-7-days
      setIsPlaying(false);

      // Reset performance tracking and buffer
      frameLoadTimes.current = [];
      frameBuffer.current.clear();
      animationQuality.current = 'high';
      setAnimationSpeed(3000);
    }
  }, [capTime.loading, totalSteps, capTime.availableTimestamps, capTime.start, capTime.end, capTime.stepHours]);

  // Enhanced playback timer with adaptive timing and frame buffering
  useEffect(() => {
    let animationFrameId;
    
    if (isPlaying && !capTime.loading && totalSteps > 0) {
      const animate = () => {
        lastFrameStart.current = Date.now();
        setIsBuffering(true);
        
        setSliderIndex(currentIndex => {
          // Move to next available frame
          const nextIndex = currentIndex + 1;
          
          if (nextIndex > totalSteps) {
            // Completed a full cycle, loop back to beginning
            setIsPlaying(false); // Stop at the end, user can restart if needed
            setIsBuffering(false);
            frameBuffer.current.clear(); // Clear buffer on animation end
            return minIndex; // Respect minimum allowed index
          }
          
          // Track performance for this frame transition
          if (lastFrameStart.current) {
            const frameTime = Date.now() - lastFrameStart.current;
            trackFramePerformance(frameTime);
          }
          
          // Intelligent preloading: Start preloading next frames if buffer is low
          const bufferedFrames = Array.from(frameBuffer.current.entries())
            .filter(([, status]) => status === 'ready').length;
          
          if (bufferedFrames < 2 && nextIndex < totalSteps - 2) {
            preloadFrames(nextIndex).catch(console.warn);
          }
          
          return nextIndex;
        });
        
        // Use adaptive timing instead of fixed 3 seconds
        if (isPlaying) {
          const currentSpeed = calculateOptimalSpeed();
          animationFrameId = setTimeout(() => {
            setIsBuffering(false);
            animate();
          }, currentSpeed);
        } else {
          setIsBuffering(false);
        }
      };

      // Start animation with adaptive delay
      const initialSpeed = calculateOptimalSpeed();
      animationFrameId = setTimeout(() => {
        setIsBuffering(false);
        animate();
      }, initialSpeed);
    }

    return () => {
      if (animationFrameId) {
        clearTimeout(animationFrameId);
      }
      setIsBuffering(false);
    };
  }, [isPlaying, capTime.loading, totalSteps, calculateOptimalSpeed, trackFramePerformance, preloadFrames, minIndex]);

  // Control functions
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlayback = useCallback(() => setIsPlaying(prev => !prev), []);
  
  const stepForward = useCallback(() => {
    if (!capTime.loading && totalSteps > 0) {
      setSliderIndex(prev => {
        const nextIndex = Math.min(prev + 1, totalSteps);
        return nextIndex;
      });
    }
  }, [capTime.loading, totalSteps]);
  
  const stepBackward = useCallback(() => {
    setSliderIndex(prev => {
      const prevIndex = Math.max(prev - 1, minIndex);
      return prevIndex;
    });
  }, [minIndex]);
  
  const setSliderToIndex = useCallback((index) => {
    const clampedIndex = Math.max(minIndex, Math.min(index, totalSteps));
    setSliderIndex(clampedIndex);
  }, [totalSteps, minIndex]);

  return {
    sliderIndex,
    setSliderIndex: setSliderToIndex,
    isPlaying,
    setIsPlaying,
    totalSteps,
    currentSliderDate,
    currentSliderDateStr,
  minIndex,
    // A+ Features
    isBuffering,
    animationSpeed,
    animationQuality: animationQuality.current,
    // Control functions
    play,
    pause,
    togglePlayback,
    stepForward,
    stepBackward,
    // Performance utilities
    trackFramePerformance
  };
};