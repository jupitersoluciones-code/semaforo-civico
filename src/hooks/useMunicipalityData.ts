import { useState, useCallback, useRef } from 'react';
import type { Contract, Goal, RealContract, ProcurementStats } from '../utils/types';
import {
  fetchContractsByMunicipality,
  fetchContractsByDepartment,
} from '../services/datosGovService';
import { analyzeRealContracts, getSemaphoreStats } from '../services/semaforoService';
import {
  getLegalThresholds,
  detectAnomalies,
  detectContractSplitting,
} from '../services/legalAnalysisService';

interface MunicipalityData {
  contracts: Contract[];
  goals: Goal[];
  realContracts: RealContract[];
  stats: ProcurementStats | null;
  splitting: Array<{ contractor: string; contracts: RealContract[]; totalValue: number }>;
  semaphoreStats: { green: number; yellow: number; red: number; total: number; greenPct: number; yellowPct: number; redPct: number };
}

export function useMunicipalityData() {
  const [data, setData] = useState<MunicipalityData>({
    contracts: [],
    goals: [],
    realContracts: [],
    stats: null,
    splitting: [],
    semaphoreStats: { green: 0, yellow: 0, red: 0, total: 0, greenPct: 0, yellowPct: 0, redPct: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadLocationData = useCallback(async (departmentCode: string, municipalityCode?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const realContracts = municipalityCode && municipalityCode.trim()
        ? await fetchContractsByMunicipality(municipalityCode, 200)
        : await fetchContractsByDepartment(departmentCode, 200);

      if (abortRef.current.signal.aborted) return;

      const entityCode = municipalityCode || departmentCode;
      const contracts = analyzeRealContracts(realContracts);
      const thresholds = getLegalThresholds(entityCode);
      const anomalies = detectAnomalies(realContracts, entityCode);
      const splitting = detectContractSplitting(realContracts, entityCode);
      const semStats = getSemaphoreStats(contracts);

      const directCount = realContracts.filter((c) =>
        (c.modalidad_de_contratacion || '').toLowerCase().includes('directa'),
      ).length;

      const stats: ProcurementStats = {
        direct: directCount,
        public: contracts.length - directCount,
        total: contracts.length,
        directPercentage: contracts.length > 0 ? (directCount / contracts.length) * 100 : 0,
        legalThresholds: thresholds,
        anomaliesDetected: anomalies,
      };

      setData({ contracts, goals: [], realContracts, stats, splitting, semaphoreStats: semStats });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message || 'Error al cargar contratos de la ubicación');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMunicipalityData = useCallback(
    async (municipalityCode: string) => {
      const departmentCode = municipalityCode.substring(0, 2);
      await loadLocationData(departmentCode, municipalityCode);
    },
    [loadLocationData],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setData({
      contracts: [],
      goals: [],
      realContracts: [],
      stats: null,
      splitting: [],
      semaphoreStats: { green: 0, yellow: 0, red: 0, total: 0, greenPct: 0, yellowPct: 0, redPct: 0 },
    });
    setIsLoading(false);
    setError(null);
  }, []);

  return { ...data, isLoading, error, loadLocationData, loadMunicipalityData, reset };
}
