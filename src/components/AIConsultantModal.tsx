import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Contract } from '../utils/types';
import { XIcon, BoltIcon } from './Icons';
import { analyzeContractWithGemini } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
}

const AIConsultantModal: React.FC<Props> = ({ isOpen, onClose, contract }) => {
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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

  const handleAnalyze = useCallback(async () => {
    if (!contract) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis('');
    const result = await analyzeContractWithGemini(contract);
    if (result.error) {
      setError(result.error);
    } else {
      setAnalysis(result.text);
    }
    setIsAnalyzing(false);
  }, [contract]);

  if (!isOpen || !contract) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ai-title">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <BoltIcon className="w-6 h-6 text-purple-600" />
            <h2 id="ai-title" className="text-lg font-bold text-slate-800">Asistente IA</h2>
          </div>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-slate-50 p-3 rounded-lg mb-4">
            <p className="text-sm font-medium text-slate-700">{contract.name}</p>
            <p className="text-xs text-slate-500">Contratista: {contract.contractor}</p>
          </div>

          {!analysis && !error && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="btn-primary w-full text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BoltIcon className="w-4 h-4" />
              {isAnalyzing ? 'Analizando contrato con IA...' : 'Analizar contrato con IA'}
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-4">
              <p className="font-medium">Error</p>
              <p className="text-xs mt-1">{error}</p>
              <button
                onClick={handleAnalyze}
                className="mt-2 text-xs font-medium text-red-600 hover:underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {analysis && (
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BoltIcon className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-slate-700">Análisis de IA</h3>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {analysis}
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="mt-3 text-xs font-medium text-purple-600 hover:underline disabled:opacity-50"
              >
                {isAnalyzing ? 'Analizando...' : 'Volver a analizar'}
              </button>
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

export default React.memo(AIConsultantModal);
