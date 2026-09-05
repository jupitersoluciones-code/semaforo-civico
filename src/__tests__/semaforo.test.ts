import { describe, it, expect } from 'vitest';
import { SemaphoreStatus } from '../utils/types';
import { calculateSemaphoreStatus } from '../services/semaforoService';

function makeContract(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test1',
    name: 'Test Contract',
    municipalityCode: '05001',
    type: 'contract' as const,
    contractor: 'Test Contractor',
    value: 1000000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    timeAdditionPercentage: 0,
    moneyAdditionPercentage: 0,
    procurementMethod: 'Licitación Pública' as const,
    numberOfBidders: 3,
    category: 'Infraestructura',
    executionPercentage: 60,
    ...overrides,
  };
}

describe('calculateSemaphoreStatus (Contract)', () => {
  it('returns Green for high execution', () => {
    expect(calculateSemaphoreStatus(makeContract({ executionPercentage: 90 }))).toBe(
      SemaphoreStatus.Green,
    );
  });

  it('returns Yellow for medium execution', () => {
    expect(calculateSemaphoreStatus(makeContract({ executionPercentage: 60 }))).toBe(
      SemaphoreStatus.Yellow,
    );
  });

  it('returns Red for low execution', () => {
    expect(calculateSemaphoreStatus(makeContract({ executionPercentage: 30 }))).toBe(
      SemaphoreStatus.Red,
    );
  });

  it('returns Red for "contrato avispa" with high money additions', () => {
    expect(
      calculateSemaphoreStatus(makeContract({ moneyAdditionPercentage: 60, executionPercentage: 90 })),
    ).toBe(SemaphoreStatus.Red);
  });

  it('returns Red for high time additions', () => {
    expect(
      calculateSemaphoreStatus(makeContract({ timeAdditionPercentage: 70, executionPercentage: 90 })),
    ).toBe(SemaphoreStatus.Red);
  });

  it('accepts additions up to 50% as normal', () => {
    expect(
      calculateSemaphoreStatus(makeContract({ moneyAdditionPercentage: 50, executionPercentage: 90 })),
    ).toBe(SemaphoreStatus.Green);
  });
});

describe('calculateSemaphoreStatus (Goal)', () => {
  function makeGoal(overrides: Record<string, unknown> = {}) {
    return {
      id: 'goal1',
      name: 'Test Goal',
      municipalityCode: '05001',
      type: 'goal' as const,
      pdtObjective: 'Objective',
      responsibleEntity: 'Entity',
      budget: 1000000,
      budgetExecutionPercentage: 50,
      executionPercentage: 60,
      ...overrides,
    };
  }

  it('returns Green for good execution and budget', () => {
    expect(
      calculateSemaphoreStatus(makeGoal({ executionPercentage: 90, budgetExecutionPercentage: 90 })),
    ).toBe(SemaphoreStatus.Green);
  });

  it('returns Red when both execution and budget are low', () => {
    expect(
      calculateSemaphoreStatus(makeGoal({ executionPercentage: 30, budgetExecutionPercentage: 30 })),
    ).toBe(SemaphoreStatus.Red);
  });

  it('returns Yellow for medium performance', () => {
    expect(
      calculateSemaphoreStatus(makeGoal({ executionPercentage: 60, budgetExecutionPercentage: 70 })),
    ).toBe(SemaphoreStatus.Yellow);
  });
});
