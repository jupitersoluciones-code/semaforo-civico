import React, { useState, useEffect, useCallback } from 'react';
import type { Municipality } from '../utils/types';
import { formatCurrency } from '../utils/formatters';
import { XIcon } from './Icons';
import { fetchContractsByMunicipality } from '../services/datosGovService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  municipalities: Municipality[];
}

interface MunicipalityStats {
  code: string;
  name: string;
  totalContracts: number;
  totalValue: number;
  avgValue: number;
  directCount: number;
  directPct: number;
}

const ComparisonView: React.FC<Props> = ({ isOpen, onClose, municipalities }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [stats, setStats] = useState<MunicipalityStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadStats = useCallback(async () => {
    if (selected.length === 0) {
      setStats([]);
      return;
    }

    setIsLoading(true);
    const results: MunicipalityStats[] = [];

    for (const code of selected) {
      const mun = municipalities.find((m) => m.code === code);
      if (!mun) continue;

      try {
        const contracts = await fetchContractsByMunicipality(code, 200);
        const totalValue = contracts.reduce((sum, c) => sum + (Number(c.valor_contrato) || 0), 0);
        const directCount = contracts.filter((c) =>
          (c.modalidad_de_contratacion || '').toLowerCase().includes('directa'),
        ).length;

        results.push({
          code,
          name: mun.name,
          totalContracts: contracts.length,
          totalValue,
          avgValue: contracts.length > 0 ? totalValue / contracts.length : 0,
          directCount,
          directPct: contracts.length > 0 ? (directCount / contracts.length) * 100 : 0,
        });
      } catch {
        results.push({
          code,
          name: mun.name,
          totalContracts: 0,
          totalValue: 0,
          avgValue: 0,
          directCount: 0,
          directPct: 0,
        });
      }
    }

    setStats(results.sort((a, b) => b.totalValue - a.totalValue));
    setIsLoading(false);
  }, [selected, municipalities]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleMunicipality = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code].slice(0, 5),
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="comparison-title">
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="comparison-title" className="text-lg font-bold text-slate-800">Comparar Municipios</h2>
            <p className="text-xs text-slate-500">Selecciona hasta 5 municipios para comparar</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {municipalities.slice(0, 50).map((m) => (
                <button
                  key={m.code}
                  onClick={() => toggleMunicipality(m.code)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    selected.includes(m.code)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8 text-slate-500 text-sm">Cargando datos comparativos...</div>
          )}

          {!isLoading && stats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="text-left p-2 text-xs font-medium text-slate-500">Municipio</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500">Contratos</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500">Valor Total</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500">Promedio</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500">% Directa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.map((s) => (
                    <tr key={s.code} className="hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-700">{s.name}</td>
                      <td className="p-2 text-right">{s.totalContracts}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(s.totalValue)}</td>
                      <td className="p-2 text-right">{formatCurrency(s.avgValue)}</td>
                      <td className={`p-2 text-right font-medium ${s.directPct > 40 ? 'text-red-600' : 'text-slate-600'}`}>
                        {s.directPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ComparisonView);
