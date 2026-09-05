import React, { useEffect, useRef } from 'react';
import type { MinorContract } from '../utils/types';
import { formatCurrency } from '../utils/formatters';
import { XIcon, WarningIcon } from './Icons';

interface Props {
  isOpen?: boolean;
  contracts: MinorContract[];
  municipalityName: string;
  onClose: () => void;
  isLoading: boolean;
}

const MinorContractsModal: React.FC<Props> = ({
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
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="minor-title">
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="minor-title" className="text-lg font-bold text-slate-800">Vigilancia a Contratación Directa</h2>
            <p className="text-xs text-slate-500">{municipalityName} • Cuantías Mínimas</p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <WarningIcon className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Posible fraccionamiento de contratos</p>
              <p className="text-xs text-amber-600 mt-1">
                Se recomienda revisar si varios contratos al mismo proveedor superan el tope legal de mínima cuantía.
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-12 text-slate-500 text-sm">Consultando...</div>
          )}

          {!isLoading && contracts.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No se encontraron contratos de cuantías mínimas.
            </div>
          )}

          {!isLoading && contracts.length > 0 && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {contracts.map((c) => (
                <div key={c.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.object}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.contractorName} • NIT: {c.contractorNit}
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

export default React.memo(MinorContractsModal);
