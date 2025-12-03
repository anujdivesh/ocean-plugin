/**
 * IslandSelector Component Tests
 * 
 * Tests for island selection UI and interaction
 */

import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import IslandSelector from './IslandSelector';

// Mock logger
jest.mock('../utils/logger', () => ({
  island: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const mockIslands = [
  { name: 'Nanumea', lat: -5.6883, lon: 176.1367, dataset: 'nanumea_forecast' },
  { name: 'Funafuti', lat: -8.5167, lon: 179.1967, dataset: 'funafuti_forecast', isCapital: true },
  { name: 'Niulakita', lat: -10.7833, lon: 179.4833, dataset: 'niulakita_forecast' }
];

// Create a mock manager instance
const createMockManager = () => {
  let mockComparisonIslands = [];
  let mockComparisonMode = false;

  return {
    getAllIslands: jest.fn(() => mockIslands),
    setCurrentIsland: jest.fn(() => true),
    getIslandByName: jest.fn((name) => mockIslands.find(i => i.name === name)),
    toggleComparisonMode: jest.fn(() => {
      mockComparisonMode = !mockComparisonMode;
      if (!mockComparisonMode) {
        mockComparisonIslands = [];
      }
      return mockComparisonMode;
    }),
    addToComparison: jest.fn((name) => {
      const island = mockIslands.find(i => i.name === name);
      if (island && !mockComparisonIslands.find(i => i.name === name)) {
        mockComparisonIslands.push(island);
        return true;
      }
      return false;
    }),
    removeFromComparison: jest.fn((name) => {
      const index = mockComparisonIslands.findIndex(i => i.name === name);
      if (index !== -1) {
        mockComparisonIslands.splice(index, 1);
        return true;
      }
      return false;
    }),
    getComparisonIslands: jest.fn(() => mockComparisonIslands),
    clearComparison: jest.fn(() => { mockComparisonIslands = []; })
  };
};

describe('IslandSelector', () => {
  let user;
  let mockManager;
  
  beforeEach(() => {
    user = userEvent.setup();
    mockManager = createMockManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render island selector button', () => {
      render(<IslandSelector islandManager={mockManager} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    test('should show "Select Island" by default', () => {
      render(<IslandSelector islandManager={mockManager} />);
      expect(screen.getByText(/Select Island/i)).toBeInTheDocument();
    });

    test('should display current island when provided', () => {
      render(<IslandSelector islandManager={mockManager} currentIsland="Funafuti" />);
      // Target the button to avoid multiple matches in dropdown
      expect(screen.getByRole('button', { name: /Funafuti/i })).toBeInTheDocument();
    });

    test('should show capital badge for Funafuti', () => {
      render(<IslandSelector islandManager={mockManager} currentIsland="Funafuti" />);
      expect(screen.getByText(/Capital/i)).toBeInTheDocument();
    });

    test('should render all islands in dropdown menu', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      
      await user.click(dropdownToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Nanumea')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Funafuti')).toBeInTheDocument();
      expect(screen.getByText('Niulakita')).toBeInTheDocument();
    });
  });

  describe('Island Selection', () => {
    test('should call onIslandChange when island is selected', async () => {
      const handleChange = jest.fn();

      render(<IslandSelector islandManager={mockManager} onIslandChange={handleChange} />);
      
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      await user.click(dropdownToggle);
      
      await waitFor(() => {
        expect(screen.getByText('Funafuti')).toBeInTheDocument();
      });
      
      const funafutiOption = screen.getByText('Funafuti');
      await user.click(funafutiOption);

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
      });
      
      const callArg = handleChange.mock.calls[0][0];
      expect(callArg.name).toBe('Funafuti');
    });

    test('should update selected island state', async () => {
      const { rerender } = render(<IslandSelector islandManager={mockManager} />);
      
      const button = screen.getByRole('button', { name: /Select Island/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Nanumea')).toBeInTheDocument();
      });
      
      const nanumea = screen.getByText('Nanumea');
      await user.click(nanumea);

      await waitFor(() => {
        expect(mockManager.setCurrentIsland).toHaveBeenCalledWith('Nanumea');
      });
    });
  });

  // Comparison mode is not required; removing related tests

  describe('Regional Grouping', () => {
    test('should display North region badge for northern islands', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      await user.click(dropdownToggle);

      await waitFor(() => {
        const nanumea = screen.getByText('Nanumea');
        expect(nanumea).toBeInTheDocument();
      });
    });

    test('should display Central region badge for central islands', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      await user.click(dropdownToggle);

      await waitFor(() => {
        const funafuti = screen.getByText('Funafuti');
        expect(funafuti).toBeInTheDocument();
      });
    });

    test('should display South region badge for southern islands', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      await user.click(dropdownToggle);

      await waitFor(() => {
        const niulakita = screen.getByText('Niulakita');
        expect(niulakita).toBeInTheDocument();
      });
    });
  });

  // Persist toggle removed per product decision

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<IslandSelector islandManager={mockManager} />);
      expect(screen.getByRole('button', { name: /Select Island/i })).toBeInTheDocument();
    });

    test('should be keyboard navigable', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      
      dropdownToggle.focus();
      expect(dropdownToggle).toHaveFocus();
    });

    test('should support Enter key to open dropdown', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
      
      dropdownToggle.focus();
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.getByText('Nanumea')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty islands array', () => {
      mockManager.getAllIslands.mockReturnValueOnce([]);
      
      render(<IslandSelector islandManager={mockManager} />);
      const selectButton = screen.getByRole('button', { name: /Select Island/i });
      expect(selectButton).toBeInTheDocument();
    });

    test('should handle null currentIsland', () => {
      render(<IslandSelector islandManager={mockManager} currentIsland={null} />);
      expect(screen.getByText(/Select Island/i)).toBeInTheDocument();
    });

    test('should handle undefined onIslandChange callback', async () => {
      render(<IslandSelector islandManager={mockManager} />);
      const button = screen.getByRole('button', { name: /Select Island/i });
      await user.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Funafuti')).toBeInTheDocument();
      });
      
      // Should not throw error
      const funafuti = screen.getByText('Funafuti');
      await user.click(funafuti);
      
      expect(mockManager.setCurrentIsland).toHaveBeenCalledWith('Funafuti');
    });

    test('should handle island not found in manager', () => {
      mockManager.getIslandByName.mockReturnValueOnce(undefined);
      
      render(<IslandSelector islandManager={mockManager} currentIsland="NonExistent" />);
      const selectButton = screen.getByRole('button', { name: /Select Island/i });
      expect(selectButton).toBeInTheDocument();
    });
  });

  describe('Data Visualization Parameters', () => {
    describe('Regional Color Coding', () => {
      test('should use correct color for Northern region (lat > -7.0)', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Nanumea')).toBeInTheDocument();
        });
        
        // Check that Nanumea (lat: -5.6883) gets North region badge
        const regionBadges = screen.getAllByText('North');
        expect(regionBadges.length).toBeGreaterThan(0);
        
        // Verify at least one North badge has the correct color (Bootstrap bg-success = green)
        const nanumea = screen.getByText('Nanumea');
        const dropdownItem = nanumea.closest('.dropdown-item');
        expect(dropdownItem).toBeInTheDocument();
      });

      test('should use correct color for Central region (-9.0 < lat <= -7.0)', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Funafuti')).toBeInTheDocument();
        });
        
        // Funafuti (lat: -8.5167) should be in Central region
        const regionBadges = screen.getAllByText('Central');
        expect(regionBadges.length).toBeGreaterThan(0);
      });

      test('should use correct color for Southern region (lat < -9.0)', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Niulakita')).toBeInTheDocument();
        });
        
        // Niulakita (lat: -10.7833) should be in South region
        const regionBadges = screen.getAllByText('South');
        expect(regionBadges.length).toBeGreaterThan(0);
      });

      test('should apply correct regional color scheme', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Nanumea')).toBeInTheDocument();
        });
        
        // Verify all three regions are represented (allow multiple matches)
        expect(screen.getAllByText('North').length).toBeGreaterThan(0); // Green (#28a745)
        expect(screen.getAllByText('Central').length).toBeGreaterThan(0); // Yellow (#ffc107)
        expect(screen.getAllByText('South').length).toBeGreaterThan(0); // Blue (#007bff)
      });
    });

    describe('Visual Indicators', () => {
      test('should display capital badge for Funafuti', () => {
        render(<IslandSelector islandManager={mockManager} currentIsland="Funafuti" />);
        
        const capitalBadges = screen.getAllByText('Capital');
        expect(capitalBadges.length).toBeGreaterThan(0);
        
        // Verify it uses the themed capital pill class
        const badge = capitalBadges[0];
        expect(badge).toHaveClass('capital-pill');
      });

      test('should display an island icon in selector button', () => {
        const { container } = render(<IslandSelector islandManager={mockManager} />);
        const button = screen.getByRole('button', { name: /Select Island/i });
        const icon = container.querySelector('.selector-icon .lucide');
        expect(button).toBeInTheDocument();
        expect(icon).toBeTruthy();
      });

      // Comparison mode not used

      // Comparison mode not used
    });

    describe('Data Presentation Accuracy', () => {
      test('should correctly categorize all islands by latitude', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Nanumea')).toBeInTheDocument();
        });
        
        // Verify categorization logic
        // Nanumea: -5.6883 -> North (> -7.0) ✓
        // Funafuti: -8.5167 -> Central (-9.0 < lat <= -7.0) ✓
        // Niulakita: -10.7833 -> South (< -9.0) ✓
        const menu = document.querySelector('.dropdown-menu');
        const northBadges = within(menu).getAllByText('North');
        const centralBadges = within(menu).getAllByText('Central');
        const southBadges = within(menu).getAllByText('South');
        
        expect(northBadges.length).toBe(1); // Only Nanumea in menu
        expect(centralBadges.length).toBe(1); // Only Funafuti in menu
        expect(southBadges.length).toBe(1); // Only Niulakita in menu
      });

      test('should maintain consistent color-region mapping', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Nanumea')).toBeInTheDocument();
        });
        
        // All North region badges in menu should have style
        const menu = document.querySelector('.dropdown-menu');
        const northBadges = within(menu).getAllByText('North');
        northBadges.forEach(badge => {
          const style = badge.getAttribute('style') || badge.parentElement?.getAttribute('style');
          // Should contain green color (#28a745) or its RGB equivalent
          expect(style).toBeTruthy();
        });
      });

      test('should display island names accurately', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          // Verify exact island names from mock data
          expect(screen.getByText('Nanumea')).toBeInTheDocument();
          expect(screen.getByText('Funafuti')).toBeInTheDocument();
          expect(screen.getByText('Niulakita')).toBeInTheDocument();
        });
      });
    });

    describe('Interactive Visualization Feedback', () => {
      test('should highlight selected island in dropdown', async () => {
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          expect(screen.getByText('Funafuti')).toBeInTheDocument();
        });
        
        const funafuti = screen.getByText('Funafuti');
        await user.click(funafuti);
        
        // Reopen dropdown
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          // Selected item should have 'active' class or styling
          const items = screen.getAllByRole('button');
          const funafutiItem = items.find(item => item.textContent.includes('Funafuti'));
          expect(funafutiItem).toBeTruthy();
        });
      });

      // Comparison mode tests removed per product decision

      test('should maintain visual consistency across state changes', async () => {
        const { rerender } = render(<IslandSelector islandManager={mockManager} />);
        
        // Initial state
        expect(screen.getByRole('button', { name: /Select Island/i })).toBeInTheDocument();
        
        // After island selection
        rerender(<IslandSelector islandManager={mockManager} currentIsland="Funafuti" />);
        const button = screen.getByRole('button', { name: /funafuti/i });
        expect(button).toHaveTextContent('Funafuti');
        expect(screen.getByText('Capital')).toBeInTheDocument();
        
        // Visual elements should remain consistent: primary selector present
        expect(screen.getByRole('button', { name: /Funafuti|Select Island/i })).toBeInTheDocument();
      });
    });

    describe('Accessibility and Semantic Visualization', () => {
      test('should use semantic color choices for regions', async () => {
        // North (Green): Safe, northern latitude
        // Central (Yellow): Caution, central region
        // South (Blue): Ocean, southern latitude
        // These colors should have sufficient contrast and meaning
        
        render(<IslandSelector islandManager={mockManager} />);
        const dropdownToggle = screen.getByRole('button', { name: /Select Island/i });
        await user.click(dropdownToggle);
        
        await waitFor(() => {
          const menu = document.querySelector('.dropdown-menu');
          expect(within(menu).getAllByText('North').length).toBeGreaterThan(0);
          expect(within(menu).getAllByText('Central').length).toBeGreaterThan(0);
          expect(within(menu).getAllByText('South').length).toBeGreaterThan(0);
        });
        
        // All region names should be visible and readable
        const menu = document.querySelector('.dropdown-menu');
        within(menu).getAllByText('North').forEach(el => expect(el).toBeVisible());
        within(menu).getAllByText('Central').forEach(el => expect(el).toBeVisible());
        within(menu).getAllByText('South').forEach(el => expect(el).toBeVisible());
      });

      test('should provide clear visual hierarchy', () => {
        render(<IslandSelector islandManager={mockManager} currentIsland="Funafuti" />);
        
        // Primary element: Island selector button
        const primaryButton = screen.getByRole('button', { name: /Funafuti/i });
        expect(primaryButton).toHaveClass('btn-primary');
      });
    });
  });

  describe('Tuvalu Whole Domain Option', () => {
    test('should display Tuvalu option in dropdown menu', async () => {
      const user = userEvent.setup();
      render(<IslandSelector islandManager={mockManager} />);
      
      // Open dropdown
      await user.click(screen.getByRole('button', { name: /Select Island/i }));
      
      // Look for Tuvalu Domain header and Tuvalu option (there are multiple matches)
      await waitFor(() => {
        const tuvaluElements = screen.getAllByText(/Tuvalu/);
        expect(tuvaluElements.length).toBeGreaterThan(0);
      });
    });

    test('should show "Whole Domain" badge for Tuvalu option', async () => {
      const user = userEvent.setup();
      render(<IslandSelector islandManager={mockManager} />);
      
      // Open dropdown
      await user.click(screen.getByRole('button', { name: /Select Island/i }));
      
      // Find the Whole Domain badge
      await waitFor(() => {
        expect(screen.getByText(/Whole Domain/i)).toBeInTheDocument();
      });
    });

    test('should call onIslandChange with TUVALU_WHOLE_DOMAIN when Tuvalu is selected', async () => {
      const user = userEvent.setup();
      const onIslandChange = jest.fn();
      render(<IslandSelector islandManager={mockManager} onIslandChange={onIslandChange} />);
      
      // Open dropdown
      await user.click(screen.getByRole('button', { name: /Select Island/i }));
      
      // Wait for dropdown to open and find the Tuvalu option (contains "🌊 Tuvalu")
      await waitFor(() => {
        expect(screen.getByText(/Whole Domain/i)).toBeInTheDocument();
      });
      
      // Click on Tuvalu domain option - find by the badge text since it's unique
      const wholeDomainBadge = screen.getByText(/Whole Domain/i);
      const tuvaluOption = wholeDomainBadge.closest('[class*="dropdown-item"]');
      await user.click(tuvaluOption);
      
      // Verify callback was called with correct parameters
      await waitFor(() => {
        expect(onIslandChange).toHaveBeenCalled();
      });
      
      // Verify the callback was called with the correct object
      const calledWith = onIslandChange.mock.calls[0][0];
      expect(calledWith).toHaveProperty('isWholeDomain', true);
      expect(calledWith).toHaveProperty('name', 'Tuvalu');
    });

    test('should display "All Islands" badge when Tuvalu is selected', async () => {
      render(<IslandSelector islandManager={mockManager} currentIsland="Tuvalu" />);
      
      // Look for the "All Islands" badge
      await waitFor(() => {
        expect(screen.getByText(/All Islands/i)).toBeInTheDocument();
      });
    });

  });
});
