import React, { useEffect, useRef } from 'react';
import type { InteradministrativeContract } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { XIcon } from './Icons';

interface Props {
  isOpen?: boolean;
  contracts: InteradministrativeContract[];
  municipalityName: string;
  onClose: () => void;
  isLoading: boolean;
}

const InteradministrativeContractsModal: React.FC<Props> = ({
  isOpen = true,
  contracts,
  municipalityName,
  onClose,
  isLoading,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="inter-title">
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="inter-title" className="text-lg font-bold text-slate-800">Contratos Interadministrativos</h2>
            <p className="text-xs text-slate-500">{municipalityName}</p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          {isLoading && <div className="text-center py-12 text-slate-500 text-sm">Consultando...</div>}
          {!isLoading && contracts.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">No se encontraron contratos interadministrativos.</div>
          )}
          {!isLoading && contracts.length > 0 && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {contracts.map((c) => (
                <div key={c.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.object}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Con: {c.contractorName} • {formatDate(c.startDate)} - {formatDate(c.endDate)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(c.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InteradministrativeContractsModal);
