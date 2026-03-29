import { describe, it, expect } from 'vitest';
import { formatSize, sanitizeFolderName, shortName } from '../src/lib/file-helpers';

describe('Utility Functions', () => {
  describe('formatSize()', () => {
    it('should format bytes', () => {
      expect(formatSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(formatSize(1024)).toBe('1.0 KB');
      expect(formatSize(2560)).toBe('2.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatSize(1048576)).toBe('1.0 MB');
      expect(formatSize(5242880)).toBe('5.0 MB');
    });

    it('should handle zero bytes', () => {
      expect(formatSize(0)).toBe('0 B');
    });
  });

  describe('sanitizeFolderName()', () => {
    it('should keep valid characters', () => {
      expect(sanitizeFolderName('alice@example.com')).toBe('alice@example.com');
    });

    it('should replace invalid characters with underscore', () => {
      expect(sanitizeFolderName('Alice Smith <alice@ex.com>')).toBe('Alice_Smith_alice@ex.com');
    });

    it('should return unknown for empty string', () => {
      expect(sanitizeFolderName('')).toBe('unknown');
    });
  });

  describe('shortName()', () => {
    it('should extract first name', () => {
      expect(shortName('Alice Smith')).toBe('Alice');
    });

    it('should strip email angle brackets', () => {
      expect(shortName('Alice Smith <alice@ex.com>')).toBe('Alice');
    });

    it('should truncate long names', () => {
      expect(shortName('Bartholomew-James')).toBe('Bartholomew…');
    });

    it('should return ? for empty string', () => {
      expect(shortName('')).toBe('?');
    });
  });
});
