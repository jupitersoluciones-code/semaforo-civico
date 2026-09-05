import React, { useState, useEffect, useRef } from 'react';
import type { RealContract } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { XIcon, BuildingOfficeIcon } from './Icons';
import { fetchContractsByMunicipality } from '../services/datosGovService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  currentMunicipalityCode: string;
}

const EntityProfile: React.FC<Props> = ({ isOpen, onClose, entityName, currentMunicipalityCode }) => {
  const [contracts, setContracts] = useState<RealContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen || !entityName) return;

    closeButtonRef.current?.focus();
    setIsLoading(true);

    fetchContractsByMunicipality(currentMunicipalityCode, 500).then((allContracts) => {
      const entityContracts = allContracts.filter(
        (c) => c.nombre_entidad === entityName,
      );
      setContracts(entityContracts);
      setIsLoading(false);
    });
  }, [isOpen, entityName, currentMunicipalityCode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalValue = contracts.reduce((sum, c) => sum + (Number(c.valor_contrato) || 0), 0);
  const byStatus: Record<string, number> = {};
  contracts.forEach((c) => {
    const status = c.estado_contrato || 'Otro';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="entity-title">
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h2 id="entity-title" className="text-lg font-bold text-slate-800">{entityName}</h2>
              <p className="text-xs text-slate-500">Perfil de contratación</p>
            </div>
          </div>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          {isLoading && <div className="text-center py-8 text-slate-500 text-sm">Cargando perfil...</div>}

          {!isLoading && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-slate-800">{contracts.length}</p>
                  <p className="text-xs text-slate-500">Contratos</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</p>
                  <p className="text-xs text-slate-500">Valor Total</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-2xl font-bold text-slate-800">
                    {contracts.length > 0 ? formatCurrency(totalValue / contracts.length) : '$0'}
                  </p>
                  <p className="text-xs text-slate-500">Promedio</p>
                </div>
              </div>

              {Object.keys(byStatus).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Por Estado</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(byStatus).map(([status, count]) => (
                      <span key={status} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                        {status}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-[300px] overflow-y-auto">
                <h3 className="text-xs font-medium text-slate-500 uppercase mb-2">Últimos Contratos</h3>
                <div className="space-y-2">
                  {contracts.slice(0, 10).map((c) => (
                    <div key={c.id_contrato || c.referencia_del_contrato} className="border border-slate-200 rounded p-2 text-xs">
                      <p className="font-medium text-slate-700 truncate">{c.objeto_del_contrato || 'Sin descripción'}</p>
                      <div className="flex justify-between mt-1 text-slate-500">
                        <span>{formatDate(c.fecha_de_firma || '')}</span>
                        <span className="font-medium text-slate-700">{formatCurrency(Number(c.valor_contrato) || 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(EntityProfile);
