import type { Contract, Goal, RealContract } from '../utils/types';
import { SemaphoreStatus } from '../utils/types';
import { mapRealContractToContract } from './datosGovService';

export function calculateSemaphoreStatus(project: Omit<Contract, 'status'> | Omit<Goal, 'status'>): SemaphoreStatus {
  if (project.type === 'contract') {
    if (project.moneyAdditionPercentage > 50 || project.timeAdditionPercentage > 50) {
      return SemaphoreStatus.Red;
    }

    const startDate = new Date(project.startDate).getTime();
    const endDate = new Date(project.endDate).getTime();
    const now = Date.now();
    if (endDate > startDate) {
      const timeElapsedPercentage = (now - startDate) / (endDate - startDate);
      if (timeElapsedPercentage > 0.75 && project.executionPercentage < 50) {
        return SemaphoreStatus.Red;
      }
    }
  }

  if (project.type === 'goal') {
    if (project.executionPercentage < 50 && project.budgetExecutionPercentage < 50) {
      return SemaphoreStatus.Red;
    }
  }

  if (project.executionPercentage < 50) {
    return SemaphoreStatus.Red;
  } else if (project.executionPercentage <= 80) {
    return SemaphoreStatus.Yellow;
  } else {
    return SemaphoreStatus.Green;
  }
}

export function analyzeRealContracts(contracts: RealContract[]): Contract[] {
  return contracts.map(mapRealContractToContract);
}

export function getSemaphoreStats(contracts: Contract[]) {
  const green = contracts.filter((c) => c.status === SemaphoreStatus.Green).length;
  const yellow = contracts.filter((c) => c.status === SemaphoreStatus.Yellow).length;
  const red = contracts.filter((c) => c.status === SemaphoreStatus.Red).length;
  const total = contracts.length;

  return {
    green,
    yellow,
    red,
    total,
    greenPct: total > 0 ? (green / total) * 100 : 0,
    yellowPct: total > 0 ? (yellow / total) * 100 : 0,
    redPct: total > 0 ? (red / total) * 100 : 0,
  };
}
