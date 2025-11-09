/**
 * Enhanced Table Styles with Accessibility and Responsive Design
 */

// Base table container styles
export const getTableContainerStyles = () => ({
  height: '100%',
  width: '100%',
  overflow: 'auto',
  padding: '12px',
  display: 'block',
  // Smooth scrolling
  scrollBehavior: 'smooth'
});

// Enhanced table styles with ocean-harmonized theme
export const getTableStyles = (isDarkMode) => ({
  borderCollapse: 'collapse',
  textAlign: 'center',
  fontSize: '0.9em',
  border: `2px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
  tableLayout: 'auto',
  width: 'fit-content',
  minWidth: '100%',
  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',  // Subtle blue-gray instead of white
  color: isDarkMode ? '#f1f5f9' : '#1e293b',
  borderRadius: '8px',
  overflow: 'hidden',
  margin: '0 auto',
  // Ocean-themed shadows with blue tint
  boxShadow: isDarkMode 
    ? '0 10px 25px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
    : '0 10px 25px rgba(30, 58, 138, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.05)'
});

// Header cell styles with ocean-harmonized theme
export const getHeaderCellStyles = (isDarkMode, isFirstColumn = false) => ({
  textAlign: isFirstColumn ? 'left' : 'center',
  fontWeight: '700',
  backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
  color: isDarkMode ? '#f1f5f9' : '#1e293b',
  border: `1px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
  padding: isFirstColumn ? '12px 16px' : '8px 6px',
  minWidth: isFirstColumn ? '200px' : '90px',
  maxWidth: isFirstColumn ? '250px' : '120px',
  width: isFirstColumn ? '220px' : '100px',
  whiteSpace: isFirstColumn ? 'nowrap' : 'pre-line',
  overflow: 'visible',
  fontSize: isFirstColumn ? '0.95em' : '0.8em',
  lineHeight: 1.4,
  verticalAlign: 'middle',
  position: 'relative',
  // Ocean-themed gradient backgrounds
  backgroundImage: isDarkMode 
    ? 'linear-gradient(180deg, #334155 0%, #1e293b 100%)'
    : 'linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 100%)',  // Blue-gray gradient
  // Subtle text shadow with blue tint
  textShadow: isDarkMode 
    ? '1px 1px 2px rgba(0, 0, 0, 0.5)' 
    : '1px 1px 2px rgba(30, 58, 138, 0.1)'  // Blue-tinted shadow
});

// Enhanced data cell styles with ocean-harmonized base colors
export const getDataCellStyles = (isDarkMode, isFirstColumn = false) => ({
  fontWeight: isFirstColumn ? '600' : '500',
  textAlign: isFirstColumn ? 'left' : 'center',
  padding: isFirstColumn ? '12px 16px' : '8px 10px',
  border: `1px solid ${isDarkMode ? '#475569' : '#cbd5e1'}`,
  minWidth: isFirstColumn ? '200px' : '90px',
  maxWidth: isFirstColumn ? '250px' : '120px',
  width: isFirstColumn ? '220px' : '100px',
  whiteSpace: 'nowrap',
  overflow: 'visible',
  cursor: isFirstColumn ? 'default' : 'pointer',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  backgroundColor: isFirstColumn 
    ? (isDarkMode ? '#334155' : '#f1f5f9')
    : (isDarkMode ? '#1e293b' : '#f8fafc'),  // Subtle blue-gray instead of harsh white
  color: isFirstColumn 
    ? (isDarkMode ? '#f1f5f9' : '#1e293b')
    : (isDarkMode ? '#e2e8f0' : '#334155'),  // Softer contrast
  fontSize: isFirstColumn ? '0.9em' : '0.85em',
  lineHeight: 1.5,
  verticalAlign: 'middle',
  position: 'relative',
  // Focus styles for accessibility
  '&:focus': {
    outline: `2px solid ${isDarkMode ? '#3b82f6' : '#2563eb'}`,
    outlineOffset: '-2px',
    zIndex: 1
  },
  // Hover effects for interactive cells with ocean theme
  '&:hover': !isFirstColumn ? {
    backgroundColor: isDarkMode ? '#374151' : '#e2e8f0',  // Harmonized hover
    transform: 'scale(1.02)',
    zIndex: 2,
    boxShadow: isDarkMode 
      ? '0 4px 12px rgba(59, 130, 246, 0.2)' 
      : '0 4px 12px rgba(30, 58, 138, 0.15)'  // Blue-tinted shadows
  } : {}
});

// Loading state styles
export const getLoadingStyles = (isDarkMode) => ({
  padding: '40px 20px',
  textAlign: 'center',
  color: isDarkMode ? '#94a3b8' : '#64748b',
  fontSize: '0.95em',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
  borderRadius: '8px',
  border: `1px solid ${isDarkMode ? '#374151' : '#e2e8f0'}`
});

// Error state styles
export const getErrorStyles = (isDarkMode) => ({
  padding: '24px',
  textAlign: 'center',
  color: '#ef4444',
  backgroundColor: isDarkMode 
    ? 'rgba(239, 68, 68, 0.1)' 
    : 'rgba(239, 68, 68, 0.05)',
  borderRadius: '8px',
  margin: '12px',
  border: `2px solid ${isDarkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
  fontSize: '0.9em',
  lineHeight: 1.6
});

// Empty state styles
export const getEmptyStateStyles = (isDarkMode) => ({
  padding: '40px 20px',
  textAlign: 'center',
  color: isDarkMode ? '#94a3b8' : '#64748b',
  fontSize: '0.95em',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
  borderRadius: '8px',
  border: `1px solid ${isDarkMode ? '#374151' : '#e2e8f0'}`
});

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: '768px',
  tablet: '1024px',
  desktop: '1200px'
};

// Responsive table styles
export const getResponsiveStyles = () => ({
  [`@media (max-width: ${BREAKPOINTS.mobile})`]: {
    fontSize: '0.8em',
    '& th, & td': {
      padding: '6px 4px',
      minWidth: '60px'
    },
    '& th:first-child, & td:first-child': {
      minWidth: '120px',
      fontSize: '0.75em'
    }
  },
  [`@media (max-width: ${BREAKPOINTS.tablet})`]: {
    '& th, & td': {
      padding: '8px 6px'
    }
  }
});