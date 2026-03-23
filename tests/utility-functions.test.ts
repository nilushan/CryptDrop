import { describe, it, expect, beforeEach } from 'vitest';
import { setupDOM } from './setup.ts';

describe('Utility Functions', () => {
  beforeEach(() => {
    setupDOM();
  });

  describe('formatSize()', () => {
    it('should format bytes', () => {
      expect(window.formatSize(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(window.formatSize(1024)).toBe('1.0 KB');
      expect(window.formatSize(2560)).toBe('2.5 KB');
    });

    it('should format megabytes', () => {
      expect(window.formatSize(1048576)).toBe('1.0 MB');
      expect(window.formatSize(5242880)).toBe('5.0 MB');
    });

    it('should handle zero bytes', () => {
      expect(window.formatSize(0)).toBe('0 B');
    });
  });

  describe('escHtml()', () => {
    it('should escape HTML special characters', () => {
      expect(window.escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should handle ampersands', () => {
      expect(window.escHtml('a & b')).toBe('a &amp; b');
    });

    it('should pass through safe text', () => {
      expect(window.escHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('toast()', () => {
    it('should show toast with message', () => {
      window.toast('Test message', 'info');
      const toast = document.getElementById('toast')!;
      const inner = document.getElementById('toastInner')!;
      expect(toast.classList.contains('hidden')).toBe(false);
      expect(inner.textContent).toBe('Test message');
    });

    it('should apply success styling', () => {
      window.toast('Success!', 'success');
      const inner = document.getElementById('toastInner')!;
      expect(inner.className).toContain('bg-green-600');
    });

    it('should apply error styling', () => {
      window.toast('Error!', 'error');
      const inner = document.getElementById('toastInner')!;
      expect(inner.className).toContain('bg-red-600');
    });

    it('should apply warning styling', () => {
      window.toast('Warning!', 'warning');
      const inner = document.getElementById('toastInner')!;
      expect(inner.className).toContain('bg-amber-600');
    });

    it('should default to info styling', () => {
      window.toast('Info');
      const inner = document.getElementById('toastInner')!;
      expect(inner.className).toContain('bg-gray-800');
    });
  });

  describe('createStatusBox()', () => {
    it('should create a success status box with text', () => {
      const box = window.createStatusBox('Key found', null, 'success');
      expect(box.tagName).toBe('DIV');
      expect(box.className).toContain('bg-green-50');
      expect(box.querySelector('p')!.textContent).toBe('Key found');
    });

    it('should create a success status box with subtext', () => {
      const box = window.createStatusBox('Key found', 'FP: ABCD', 'success');
      const paragraphs = box.querySelectorAll('p');
      expect(paragraphs.length).toBe(2);
      expect(paragraphs[1].textContent).toBe('FP: ABCD');
    });

    it('should create a warning status box', () => {
      const box = window.createStatusBox('Not found', null, 'warning');
      expect(box.className).toContain('bg-amber-50');
    });
  });
});
