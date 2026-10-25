import { describe, it, expect } from 'vitest';
import { formatSize, sanitizeFolderName, sanitizeDownloadFilename, shortName } from '../src/lib/file-helpers';
import { evaluatePassphrase, isPassphraseAcceptable } from '../src/lib/passphrase-strength';

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

  describe('sanitizeDownloadFilename()', () => {
    it('should strip directory traversal paths', () => {
      expect(sanitizeDownloadFilename('../../../../etc/passwd')).toBe('passwd');
    });

    it('should strip backslash paths', () => {
      expect(sanitizeDownloadFilename('C:\\Users\\malware.exe')).toBe('malware.exe');
    });

    it('should remove control characters', () => {
      expect(sanitizeDownloadFilename('file\x00name.txt')).toBe('filename.txt');
    });

    it('should cap length at 255 characters', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const result = sanitizeDownloadFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result).toMatch(/\.txt$/);
    });

    it('should return fallback for empty string', () => {
      expect(sanitizeDownloadFilename('')).toBe('decrypted_file');
    });

    it('should pass through normal filenames', () => {
      expect(sanitizeDownloadFilename('document.pdf')).toBe('document.pdf');
    });
  });

  describe('evaluatePassphrase()', () => {
    it('should rate empty passphrase as weak', () => {
      expect(evaluatePassphrase('').level).toBe('weak');
    });

    it('should rate short passphrase as weak', () => {
      expect(evaluatePassphrase('abc').level).toBe('weak');
    });

    it('should rate medium passphrase as fair', () => {
      // 10+ chars (score +1) + has digit (score +1) = 2 → fair
      expect(evaluatePassphrase('abcdefghij1').level).toBe('fair');
    });

    it('should rate long mixed passphrase as strong', () => {
      expect(evaluatePassphrase('Correct Horse Battery!1').level).toBe('strong');
    });

    it('should rate multi-word passphrase as strong', () => {
      expect(evaluatePassphrase('correct horse battery staple').level).toBe('strong');
    });
  });

  describe('isPassphraseAcceptable()', () => {
    it('should reject short passphrases', () => {
      expect(isPassphraseAcceptable('short')).toBe(false);
    });

    it('should reject passphrases under 12 characters', () => {
      expect(isPassphraseAcceptable('longenough!')).toBe(false); // 11 chars
    });

    it('should reject weak 12+ char passphrases with no complexity', () => {
      expect(isPassphraseAcceptable('aaaaaaaaaaaa')).toBe(false); // 12 chars, score 1
    });

    it('should accept 12+ char passphrases with fair strength', () => {
      expect(isPassphraseAcceptable('MyPassphrase1')).toBe(true); // mixed case + digit, 13 chars
    });

    it('should accept strong multi-word passphrases', () => {
      expect(isPassphraseAcceptable('correct horse battery')).toBe(true);
    });
  });
});
