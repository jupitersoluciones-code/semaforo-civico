import React, { useEffect, useState, useRef } from 'react';
import type { Contract, MarketPriceItem, ContractItem } from '../utils/types';
import { formatCurrency } from '../utils/formatters';
import { XIcon } from './Icons';

const MOCK_MARKET_PRICES: MarketPriceItem[] = [
  { id: 'mp1', name: 'Pintura Sintética 1gl', unit: 'Bulto', averagePrice: 120000 },
  { id: 'mp2', name: 'Concreto F\'21 m³', unit: 'Metro Cúbico', averagePrice: 280000 },
  { id: 'mp3', name: 'Varilla #4 (12m)', unit: 'Unidad', averagePrice: 35000 },
  { id: 'mp4', name: 'Hora Trabajo Operario', unit: 'Hora', averagePrice: 18000 },
];

const MOCK_CONTRACT_ITEMS: ContractItem[] = [
  { contractId: 'mock1', marketItemId: 'mp1', quantity: 50, unitPrice: 145000 },
  { contractId: 'mock1', marketItemId: 'mp2', quantity: 100, unitPrice: 310000 },
  { contractId: 'mock1', marketItemId: 'mp3', quantity: 200, unitPrice: 38000 },
  { contractId: 'mock1', marketItemId: 'mp4', quantity: 500, unitPrice: 22000 },
];

interface Props {
  contract: Contract;
  onClose: () => void;
  onAlertClick: (contract: Contract) => void;
}

const PriceComparisonModal: React.FC<Props> = ({ contract, onClose, onAlertClick }) => {
  const [items, setItems] = useState<(ContractItem & { marketPrice: MarketPriceItem })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    if (contract.hasItemsToCompare) {
      setTimeout(() => {
        const matched = MOCK_CONTRACT_ITEMS.filter((ci) => ci.contractId === contract.id).map((ci) => {
          const mp = MOCK_MARKET_PRICES.find((p) => p.id === ci.marketItemId);
          return mp ? { ...ci, marketPrice: mp } : null;
        }).filter(Boolean) as (ContractItem & { marketPrice: MarketPriceItem })[];

        if (matched.length === 0) {
          const fallback = MOCK_CONTRACT_ITEMS.slice(0, 3).map((ci) => ({
            ...ci,
            contractId: contract.id,
            marketPrice: MOCK_MARKET_PRICES.find((p) => p.id === ci.marketItemId)!,
          }));
          setItems(fallback);
        } else {
          setItems(matched);
        }
        setIsLoading(false);
      }, 800);
    } else {
      setIsLoading(false);
    }
  }, [contract]);

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="price-title">
      <div className="modal-content max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="price-title" className="text-lg font-bold text-slate-800">Comparación de Precios</h2>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-slate-600 mb-4">
            Comparación de precios unitarios del contrato contra precios de mercado de referencia.
          </p>

          {isLoading && (
            <div className="text-center py-8 text-slate-500 text-sm">Cargando datos...</div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              {contract.hasItemsToCompare
                ? 'No hay ítems disponibles para comparar.'
                : 'Este contrato no tiene ítems de comparación disponibles.'}
            </div>
          )}

          {items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th scope="col" className="text-left p-2 text-xs font-medium text-slate-500 uppercase">Ítem</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500 uppercase">Cantidad</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500 uppercase">Precio Unitario</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500 uppercase">Precio Mercado</th>
                    <th scope="col" className="text-right p-2 text-xs font-medium text-slate-500 uppercase">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => {
                    const diff = item.marketPrice.averagePrice > 0
                      ? ((item.unitPrice - item.marketPrice.averagePrice) / item.marketPrice.averagePrice) * 100
                      : 0;
                    return (
                      <tr key={item.marketItemId} className="hover:bg-slate-50">
                        <td className="p-2">
                          <div className="font-medium text-slate-700">{item.marketPrice.name}</div>
                          <div className="text-xs text-slate-400">{item.marketPrice.unit}</div>
                        </td>
                        <td className="p-2 text-right">{item.quantity}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2 text-right">{formatCurrency(item.marketPrice.averagePrice)}</td>
                        <td className={`p-2 text-right font-semibold ${diff > 20 ? 'text-red-600' : diff < -10 ? 'text-green-600' : 'text-slate-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end p-4 border-t border-slate-200">
          <button
            onClick={() => {
              onClose();
              onAlertClick(contract);
            }}
            className="btn-primary text-sm"
          >
            Generar Alerta
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PriceComparisonModal);
