/**
 * InundationPointsService Tests
 * 
 * Unit tests for the InundationPointsService helper methods
 */

import InundationPointsService from './InundationPointsService';

describe('InundationPointsService', () => {
  describe('extractAtollNameFromUrl', () => {
    let service;

    beforeEach(() => {
      // Create a new instance for each test
      service = new InundationPointsService({ debugMode: false });
    });

    test('should extract atoll name from valid forecast image URL', () => {
      const url = 'http://example.com/path/Nanumaga_t_3_forecast.png';
      expect(service.extractAtollNameFromUrl(url)).toBe('Nanumaga');
    });

    test('should extract atoll name with different index numbers', () => {
      expect(service.extractAtollNameFromUrl('/path/Funafuti_t_1_forecast.png')).toBe('Funafuti');
      expect(service.extractAtollNameFromUrl('/path/Niulakita_t_12_forecast.png')).toBe('Niulakita');
      expect(service.extractAtollNameFromUrl('/path/Nui_t_99_forecast.png')).toBe('Nui');
    });

    test('should extract atoll name from full URL with protocol', () => {
      const url = 'https://gemthreddshpc.spc.int/thredds/fileServer/POP/model/country/spc/forecast/hourly/TUV/Vaitupu_t_5_forecast.png';
      expect(service.extractAtollNameFromUrl(url)).toBe('Vaitupu');
    });

    test('should return null for null input', () => {
      expect(service.extractAtollNameFromUrl(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(service.extractAtollNameFromUrl(undefined)).toBeNull();
    });

    test('should return null for empty string', () => {
      expect(service.extractAtollNameFromUrl('')).toBeNull();
    });

    test('should return null for URL without matching pattern', () => {
      expect(service.extractAtollNameFromUrl('/path/some_other_image.png')).toBeNull();
      expect(service.extractAtollNameFromUrl('/path/forecast.png')).toBeNull();
      expect(service.extractAtollNameFromUrl('/path/Nanumaga_forecast.png')).toBeNull();
    });

    test('should return null for URL with wrong extension', () => {
      expect(service.extractAtollNameFromUrl('/path/Nanumaga_t_3_forecast.jpg')).toBeNull();
      expect(service.extractAtollNameFromUrl('/path/Nanumaga_t_3_forecast')).toBeNull();
    });

    test('should only match alphabetic atoll names', () => {
      // Should not match names with numbers or special characters
      expect(service.extractAtollNameFromUrl('/path/Test123_t_1_forecast.png')).toBeNull();
      expect(service.extractAtollNameFromUrl('/path/Test-Name_t_1_forecast.png')).toBeNull();
    });
  });

  describe('ATOLL_NAME_PATTERN', () => {
    test('should be a valid RegExp', () => {
      expect(InundationPointsService.ATOLL_NAME_PATTERN).toBeInstanceOf(RegExp);
    });

    test('should match expected pattern format', () => {
      const pattern = InundationPointsService.ATOLL_NAME_PATTERN;
      expect('/Nanumaga_t_3_forecast.png').toMatch(pattern);
      expect('/Funafuti_t_1_forecast.png').toMatch(pattern);
    });
  });

  describe('showImageModal', () => {
    beforeEach(() => {
      // Clean up any existing modals
      const existingModal = document.getElementById('inundation-image-modal');
      if (existingModal) {
        existingModal.remove();
      }
    });

    afterEach(() => {
      // Clean up after each test
      const modal = document.getElementById('inundation-image-modal');
      if (modal) {
        modal.remove();
      }
    });

    test('should create modal element when called with valid URL', () => {
      InundationPointsService.showImageModal('http://example.com/image.png');
      const modal = document.getElementById('inundation-image-modal');
      expect(modal).toBeInTheDocument();
    });

    test('should create image with correct src attribute', () => {
      const imageUrl = 'http://example.com/test-image.png';
      InundationPointsService.showImageModal(imageUrl);
      const modal = document.getElementById('inundation-image-modal');
      const img = modal.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img.src).toBe(imageUrl);
    });

    test('should not create modal for null input', () => {
      InundationPointsService.showImageModal(null);
      const modal = document.getElementById('inundation-image-modal');
      expect(modal).not.toBeInTheDocument();
    });

    test('should not create modal for non-string input', () => {
      InundationPointsService.showImageModal(123);
      const modal = document.getElementById('inundation-image-modal');
      expect(modal).not.toBeInTheDocument();
    });

    test('should reuse existing modal if present', () => {
      // Create first modal
      InundationPointsService.showImageModal('http://example.com/first.png');
      const firstModal = document.getElementById('inundation-image-modal');
      
      // Call again with different image
      InundationPointsService.showImageModal('http://example.com/second.png');
      const secondModal = document.getElementById('inundation-image-modal');
      
      // Should be the same modal element
      expect(firstModal).toBe(secondModal);
      
      // Should have updated image
      const img = secondModal.querySelector('img');
      expect(img.src).toBe('http://example.com/second.png');
    });

    test('should set modal to close on click', () => {
      InundationPointsService.showImageModal('http://example.com/image.png');
      const modal = document.getElementById('inundation-image-modal');
      
      expect(modal.style.display).toBe('flex');
      
      // Simulate click on modal backdrop
      modal.click();
      
      // Modal should be hidden (not removed)
      expect(modal.style.display).toBe('none');
      expect(document.body.style.overflow).toBe('');
    });
  });
});
