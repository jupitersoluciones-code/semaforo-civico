import { useState, useCallback, useRef } from 'react';
import type { Contract, Goal, RealContract, ProcurementStats } from '../utils/types';
import {
  fetchContractsByMunicipality,
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

  const loadMunicipalityData = useCallback(async (municipalityCode: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const realContracts = await fetchContractsByMunicipality(municipalityCode, 200);

      if (abortRef.current.signal.aborted) return;

      const contracts = analyzeRealContracts(realContracts);
      const thresholds = getLegalThresholds(municipalityCode);
      const anomalies = detectAnomalies(realContracts, municipalityCode);
      const splitting = detectContractSplitting(realContracts, municipalityCode);
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
        setError(err.message || 'Error al cargar datos del municipio');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return { ...data, isLoading, error, loadMunicipalityData, reset };
}
