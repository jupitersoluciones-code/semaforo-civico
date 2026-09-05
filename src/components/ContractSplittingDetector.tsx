import React from 'react';
import type { RealContract } from '../utils/types';
import { formatCurrency } from '../utils/formatters';
import { WarningIcon } from './Icons';

interface SplitGroup {
  contractor: string;
  contracts: RealContract[];
  totalValue: number;
}

interface Props {
  splitting: SplitGroup[];
}

const ContractSplittingDetector: React.FC<Props> = ({ splitting }) => {
  if (splitting.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Detección de Fraccionamiento</h3>
        <p className="text-xs text-slate-500">No se detectaron patrones de fraccionamiento de contratos.</p>
      </div>
    );
  }

  return (
    <div className="card p-4 border-l-4 border-amber-400">
      <div className="flex items-center gap-2 mb-3">
        <WarningIcon className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-amber-800">
          Posible Fraccionamiento Detectado ({splitting.length})
        </h3>
      </div>
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {splitting.map((group) => (
          <div key={group.contractor} className="bg-amber-50 rounded-lg p-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-800">{group.contractor}</p>
                <p className="text-xs text-slate-500">{group.contracts.length} contratos</p>
              </div>
              <p className="text-sm font-semibold text-amber-700">{formatCurrency(group.totalValue)}</p>
            </div>
            <div className="mt-2 space-y-1">
              {group.contracts.slice(0, 3).map((c) => (
                <div key={c.id_contrato || c.referencia_del_contrato} className="text-xs text-slate-600 flex justify-between">
                  <span className="truncate max-w-[70%]">{c.objeto_del_contrato || 'Sin descripción'}</span>
                  <span>{formatCurrency(Number(c.valor_contrato) || 0)}</span>
                </div>
              ))}
              {group.contracts.length > 3 && (
                <p className="text-xs text-slate-400">+{group.contracts.length - 3} más</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(ContractSplittingDetector);
