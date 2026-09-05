import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { RealContract } from '../utils/types';
import { searchContractsByText } from '../services/datosGovService';
import { formatCurrency } from '../utils/formatters';
import { SearchIcon, XIcon } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectContract: (contract: RealContract) => void;
}

const SearchBar: React.FC<Props> = ({ isOpen, onClose, onSelectContract }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RealContract[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (value.trim().length < 3) {
        setResults([]);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const data = await searchContractsByText(value.trim(), 20);
          setResults(data);
        } catch {
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
    },
    [],
  );

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="search-title">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <SearchIcon className="w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar contratos por objeto, proveedor, entidad..."
              className="flex-1 text-sm outline-none"
              aria-label="Buscar contratos"
            />
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
              <XIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {isSearching && (
            <div className="p-8 text-center text-slate-500 text-sm">Buscando contratos...</div>
          )}

          {!isSearching && results.length === 0 && query.length >= 3 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              No se encontraron contratos para "{query}"
            </div>
          )}

          {results.map((contract) => (
            <button
              key={contract.id_contrato || contract.referencia_del_contrato}
              onClick={() => {
                onSelectContract(contract);
                onClose();
              }}
              className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-100 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {contract.objeto_del_contrato || contract.descripcion_del_proceso || 'Sin descripción'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {contract.nombre_entidad} • {contract.proveedor_adjudicado || 'No adjudicado'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-700">
                    {formatCurrency(Number(contract.valor_contrato) || 0)}
                  </p>
                  <p className="text-xs text-slate-400">{contract.estado_contrato || ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SearchBar);
