import React from 'react';
import { motion } from 'framer-motion';

/**
 * Fancy Animated Icon Component
 * Provides beautiful animations and effects for Lucide React icons
 * without affecting the document layout.
 */
const FancyIcon = ({
  icon: IconComponent, 
  size = 24,
  className = "", 
  animationType = "hover",
  color = "currentColor",
  onClick = null,
  style = {}
}) => {
  // Animation variants - Refined to be subtle and prevent layout shifts.
  const getAnimationProps = () => {
    switch(animationType) {
      case 'wave':
        return {
          animate: { y: [0, -1, 0] },
          transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        };
      case 'spin':
        return {
          animate: { rotate: 360 },
          transition: { duration: 8, repeat: Infinity, ease: "linear" }
        };
      case 'pulse':
        return {
          animate: { scale: [1, 1.04, 1] },
          transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        };
      case 'bounce':
        return {
          whileHover: { y: -1.5, transition: { duration: 0.2 } },
          whileTap: { scale: 0.98 }
        };
      case 'shimmer':
        return {
          animate: { opacity: [0.7, 1, 0.7] },
          transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
        };
      default: // hover
        return {
          whileHover: { scale: 1.08, transition: { duration: 0.2 } },
          whileTap: { scale: 0.95 }
        };
    }
  };

  if (!IconComponent) {
    console.error('FancyIcon: IconComponent is undefined');
    return null;
  }

  return (
    <div
      className={`fancy-icon-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        position: 'relative', // Establish a positioning context
        ...style
      }}
    >
      <motion.div
        onClick={onClick}
        style={{
          cursor: onClick ? 'pointer' : 'default',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'absolute', // Take the animated element out of the layout flow
          willChange: 'transform, opacity', // Performance optimization
        }}
        {...getAnimationProps()}
      >
        <IconComponent 
          size={size} 
          color={color}
          strokeWidth={1.5}
        />
      </motion.div>
    </div>
  );
};

export default FancyIcon;