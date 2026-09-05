import { describe, it, expect } from 'vitest';
import { getLegalThresholds } from '../services/legalAnalysisService';

describe('getLegalThresholds', () => {
  it('assigns category Especial to Medellín', () => {
    const result = getLegalThresholds('05001');
    expect(result.municipalityCategory).toBe('Especial');
  });

  it('calculates highest menor cuantía for large budgets', () => {
    const result = getLegalThresholds('05001');
    expect(result.menorCuantiaLimit).toBe(1000 * result.smmlvValue);
  });

  it('assigns default category 6 to unknown municipalities', () => {
    const result = getLegalThresholds('99999');
    expect(result.municipalityCategory).toBe('6');
  });

  it('minima cuantia is 10% of menor cuantia', () => {
    const result = getLegalThresholds('05001');
    expect(result.minimaCuantiaLimit).toBeCloseTo(result.menorCuantiaLimit * 0.1, 5);
  });

  it('smmlv value is defined', () => {
    const result = getLegalThresholds('05001');
    expect(result.smmlvValue).toBeGreaterThan(0);
  });
});
