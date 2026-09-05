import { fetchJson } from './apiClient';
import type { CeroCorrupcionStats } from '../utils/types';

const BASE_URL = 'https://www.cerocorrupcion.pro/api';

export async function fetchGlobalStats(): Promise<CeroCorrupcionStats | null> {
  try {
    const data = await fetchJson<{ ok: boolean; data?: CeroCorrupcionStats }>(
      `${BASE_URL}/contratos/stats`,
    );
    return data.ok && data.data ? data.data : null;
  } catch (error) {
    console.warn('CeroCorrupcion API unavailable:', error);
    return null;
  }
}

export async function fetchContractAudit(
  contractId: string,
): Promise<{ riskScore: number; analysis: string } | null> {
  try {
    const data = await fetchJson<{
      ok: boolean;
      data?: { riskScore: number; analysis: string };
    }>(`${BASE_URL}/auditor/${contractId}`);
    return data.ok && data.data ? data.data : null;
  } catch (error) {
    console.warn('Audit unavailable:', error);
    return null;
  }
}

export async function fetchRankings(
  groupBy: string,
  measure: string,
  limit = 10,
): Promise<Array<Record<string, unknown>> | null> {
  try {
    const params = new URLSearchParams({
      groupBy,
      measure,
      limit: String(limit),
    });
    const data = await fetchJson<{
      ok: boolean;
      data?: Array<Record<string, unknown>>;
    }>(`${BASE_URL}/contratos/rankings?${params.toString()}`);
    return data.ok && data.data ? data.data : null;
  } catch (error) {
    console.warn('Rankings unavailable:', error);
    return null;
  }
}
