import React, { useEffect, useState, useRef } from 'react';
import type { Contract } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { XIcon, BoltIcon } from './Icons';
import { fetchContractAudit } from '../services/cerocorrupcionService';

interface Props {
  contract: Contract;
  onClose: () => void;
  onAlertClick: (contract: Contract) => void;
  onComparePricesClick: (contract: Contract) => void;
  onAIClick?: (contract: Contract) => void;
}

const ContractDetailsModal: React.FC<Props> = ({
  contract,
  onClose,
  onAlertClick,
  onComparePricesClick,
  onAIClick,
}) => {
  const [audit, setAudit] = useState<{ riskScore: number; analysis: string } | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    fetchContractAudit(contract.id).then(setAudit);
  }, [contract.id]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="detail-title" className="text-lg font-bold text-slate-800">Detalles del Contrato</h2>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold text-slate-800">{contract.name}</h3>
            <p className="text-xs text-slate-500 mt-1">ID: {contract.id}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500">Contratista</span>
              <p className="text-sm font-medium text-slate-700">{contract.contractor}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Valor</span>
              <p className="text-sm font-medium text-slate-700">{formatCurrency(contract.value)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Modalidad</span>
              <p className="text-sm font-medium text-slate-700">{contract.procurementMethod}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Categoría</span>
              <p className="text-sm font-medium text-slate-700">{contract.category}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Fecha Inicio</span>
              <p className="text-sm font-medium text-slate-700">{formatDate(contract.startDate)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Fecha Fin</span>
              <p className="text-sm font-medium text-slate-700">{formatDate(contract.endDate)}</p>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-500">Ejecución</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-blue-500"
                  style={{ width: `${contract.executionPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium">{contract.executionPercentage}%</span>
            </div>
          </div>

          {(contract.timeAdditionPercentage > 0 || contract.moneyAdditionPercentage > 0) && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-800 mb-1">Adiciones</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-amber-600">Tiempo:</span>{' '}
                  <span className="font-medium">{contract.timeAdditionPercentage}%</span>
                </div>
                <div>
                  <span className="text-amber-600">Valor:</span>{' '}
                  <span className="font-medium">{contract.moneyAdditionPercentage}%</span>
                </div>
              </div>
            </div>
          )}

          {audit && (
            <div className={`p-3 rounded-lg border ${
              audit.riskScore > 60 ? 'bg-red-50 border-red-200' :
              audit.riskScore > 30 ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Análisis de Riesgo (IA)</h4>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  audit.riskScore > 60 ? 'bg-red-200 text-red-800' :
                  audit.riskScore > 30 ? 'bg-yellow-200 text-yellow-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  Riesgo: {audit.riskScore}%
                </span>
              </div>
              <p className="text-xs text-slate-600">{audit.analysis}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          {onAIClick && (
            <button
              onClick={() => onAIClick(contract)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            >
              <BoltIcon className="w-4 h-4" />
              Asistente IA
            </button>
          )}
          <button
            onClick={() => onComparePricesClick(contract)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            Comparar Precios
          </button>
          <button
            onClick={() => {
              onClose();
              onAlertClick(contract);
            }}
            className="px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
          >
            Generar Alerta
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ContractDetailsModal);
