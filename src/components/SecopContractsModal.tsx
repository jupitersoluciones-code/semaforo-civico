import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { RealContract } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { XIcon, SearchIcon } from './Icons';

interface Props {
  isOpen?: boolean;
  contracts: RealContract[];
  municipalityName: string;
  onClose: () => void;
  isLoading: boolean;
}

const ITEMS_PER_PAGE = 20;

const SecopContractsModal: React.FC<Props> = ({
  isOpen = true,
  contracts,
  municipalityName,
  onClose,
  isLoading,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Reset page when search or contracts change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, contracts]);

  const filteredContracts = useMemo(() => {
    if (!searchTerm.trim()) return contracts;
    const q = searchTerm.toLowerCase();
    return contracts.filter(
      (c) =>
        (c.objeto_del_contrato || '').toLowerCase().includes(q) ||
        (c.proveedor_adjudicado || '').toLowerCase().includes(q) ||
        (c.nombre_entidad || '').toLowerCase().includes(q) ||
        (c.id_contrato || '').toLowerCase().includes(q) ||
        (c.modalidad_de_contratacion || '').toLowerCase().includes(q),
    );
  }, [contracts, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredContracts.length / ITEMS_PER_PAGE));
  const paginatedContracts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredContracts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredContracts, currentPage]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="secop-title">
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="secop-title" className="text-lg font-bold text-slate-800">Control Social a SECOP II</h2>
            <p className="text-xs text-slate-500">
              {municipalityName || 'Consulta territorial'} • {filteredContracts.length} contratos encontrados
            </p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Buscador interno */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por contratista, objeto, modalidad o código de contrato..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-4">
          {isLoading && (
            <div className="text-center py-16 text-slate-500 text-sm">
              <span className="text-3xl block mb-2 animate-spin">⏳</span>
              Consultando Datos Abiertos de SECOP II...
            </div>
          )}

          {!isLoading && filteredContracts.length === 0 && (
            <div className="text-center py-16 text-slate-500 text-sm">
              No se encontraron procesos de contratación que coincidan con la búsqueda.
            </div>
          )}

          {!isLoading && filteredContracts.length > 0 && (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {paginatedContracts.map((c) => {
                const contractValue = Number(c.valor_total_con_adiciones) || Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0;
                return (
                  <div
                    key={c.id_contrato || c.referencia_del_contrato || Math.random()}
                    className="border border-slate-200 rounded-lg p-3.5 hover:border-blue-300 hover:bg-blue-50/20 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                          {c.objeto_del_contrato || c.descripcion_del_proceso || 'Sin descripción'}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">🏢 {c.nombre_entidad || 'Entidad pública'}</span>
                          <span>👤 {c.proveedor_adjudicado || 'No adjudicado'}</span>
                          <span>📑 {c.modalidad_de_contratacion || 'N/A'}</span>
                          <span>📅 {formatDate(c.fecha_de_firma || c.fecha_inicio_ejecucion || '')}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 md:min-w-[140px]">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(contractValue)}</p>
                        <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {c.estado_contrato || 'Estado N/A'}
                        </span>
                        {c.id_contrato && (
                          <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {c.id_contrato}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Paginación y Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500">
            Página {currentPage} de {totalPages} ({filteredContracts.length} registros)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Siguiente
            </button>
            <button onClick={onClose} className="ml-3 btn-primary text-xs py-1.5 px-4">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SecopContractsModal);
