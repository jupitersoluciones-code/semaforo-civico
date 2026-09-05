import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatCompactCurrency, getSemaphoreColor } from '../utils/formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('formats COP currency correctly', () => {
      expect(formatCurrency(1300000)).toContain('1.300');
    });

    it('handles zero', () => {
      expect(formatCurrency(0)).toContain('0');
    });
  });

  describe('formatDate', () => {
    it('formats valid dates', () => {
      const result = formatDate('2024-01-15');
      expect(result).not.toBe('N/A');
    });

    it('returns N/A for invalid dates', () => {
      expect(formatDate('')).toBe('N/A');
      expect(formatDate('not-a-date')).toBe('N/A');
    });
  });

  describe('formatCompactCurrency', () => {
    it('formats billions', () => {
      expect(formatCompactCurrency(1_500_000_000)).toBe('$1.5B');
    });

    it('formats millions', () => {
      expect(formatCompactCurrency(1_500_000)).toBe('$1.5M');
    });

    it('formats thousands', () => {
      expect(formatCompactCurrency(2_500)).toBe('$3K');
    });
  });

  describe('getSemaphoreColor', () => {
    it('returns green classes for Verde', () => {
      expect(getSemaphoreColor('Verde')).toContain('green');
    });

    it('returns yellow classes for Amarillo', () => {
      expect(getSemaphoreColor('Amarillo')).toContain('yellow');
    });

    it('returns red classes for Rojo', () => {
      expect(getSemaphoreColor('Rojo')).toContain('red');
    });

    it('returns slate classes for unknown', () => {
      expect(getSemaphoreColor('Desconocido')).toContain('slate');
    });
  });
});
