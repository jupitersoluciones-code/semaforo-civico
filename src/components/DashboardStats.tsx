import React from 'react';
import type { ProcurementStats } from '../utils/types';
import { formatCurrency } from '../utils/formatters';

interface Props {
  stats: ProcurementStats | null;
  isLoading: boolean;
}

const DashboardStats: React.FC<Props> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-card h-24 bg-slate-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const { legalThresholds, anomaliesDetected, directPercentage, total } = stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Categoría Municipal
          </h3>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {legalThresholds.municipalityCategory}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Presupuesto: {legalThresholds.municipalityBudgetSMMLV.toLocaleString()} SMMLV
          </p>
        </div>

        <div className="stat-card">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Menor Cuantía
          </h3>
          <p className="text-lg font-bold text-blue-600 mt-1">
            {formatCurrency(legalThresholds.menorCuantiaLimit)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            SMMLV 2024: {formatCurrency(legalThresholds.smmlvValue)}
          </p>
        </div>

        <div className="stat-card">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Mínima Cuantía
          </h3>
          <p className="text-lg font-bold text-teal-600 mt-1">
            {formatCurrency(legalThresholds.minimaCuantiaLimit)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            10% de Menor Cuantía
          </p>
        </div>
      </div>

      {total > 0 && (
        <div className="stat-card">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Distribución de Contratación
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">
                  Contratación Directa ({stats.direct})
                </span>
                <span className="font-medium">{directPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    directPercentage > 40 ? 'bg-red-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${Math.min(directPercentage, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">
                  Licitación Pública ({stats.public})
                </span>
                <span className="font-medium">{(100 - directPercentage).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-blue-500"
                  style={{ width: `${Math.min(100 - directPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
          {directPercentage > 40 && (
            <p className="text-xs text-red-600 mt-2 font-medium">
              ⚠️ Porcentaje alto de contratación directa ({directPercentage.toFixed(1)}%). Se recomienda revisión.
            </p>
          )}
        </div>
      )}

      {anomaliesDetected.length > 0 && (
        <div className="stat-card border-l-4 border-red-400">
          <h3 className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2">
            Anomalías Detectadas ({anomaliesDetected.length})
          </h3>
          <ul className="space-y-1">
            {anomaliesDetected.slice(0, 5).map((anomaly, idx) => (
              <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                <span className="text-red-500 mt-0.5" aria-hidden="true">•</span>
                {anomaly}
              </li>
            ))}
          </ul>
          {anomaliesDetected.length > 5 && (
            <p className="text-xs text-slate-500 mt-2">
              y {anomaliesDetected.length - 5} más...
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(DashboardStats);
