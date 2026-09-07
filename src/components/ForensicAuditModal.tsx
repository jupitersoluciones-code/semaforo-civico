import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Contract } from '../utils/types';
import { formatCurrency } from '../utils/formatters';
import { XIcon, BoltIcon, WarningIcon } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
}

type AuditFocus = 'forensic' | 'preventive' | 'dissuasive';

const ForensicAuditModal: React.FC<Props> = ({ isOpen, onClose, contract }) => {
  const [auditFocus, setAuditFocus] = useState<AuditFocus>('forensic');
  const [reportText, setReportText] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Reset report when contract changes
  useEffect(() => {
    if (contract) {
      setReportText('');
      setError(null);
      setCopied(false);
    }
  }, [contract]);

  const handleRunAudit = useCallback(async () => {
    if (!contract) return;
    setIsAuditing(true);
    setError(null);
    setReportText('');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract,
          mode: 'forensic',
          auditFocus,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Error al procesar dictamen forense.');
      }

      setReportText(data.text || 'Sin dictamen generado.');
    } catch (err: any) {
      console.error('Error en auditoría forense FAEPP:', err);
      setError(err?.message || 'Fallo de conexión con el motor forense.');
    } finally {
      setIsAuditing(false);
    }
  }, [contract, auditFocus]);

  const handleCopyReport = () => {
    if (!reportText) return;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen || !contract) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="faepp-title">
      <div className="modal-content max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera Forense */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg text-white">
              <BoltIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="faepp-title" className="text-base font-bold text-white">
                  Motor de Auditoría Forense en Contratación Pública (FAEPP)
                </h2>
                <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                  v2.0 Anti-Corrupción
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dictámenes periciales basados en la Ley 80/1993, Ley 1150/2007, Ley 1474/2011 y principio de extremo escepticismo
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Metadatos del Contrato Auditado */}
        <div className="bg-slate-800 text-slate-200 p-3.5 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400">Contrato:</span>{' '}
            <span className="font-bold text-white">{contract.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>
              <strong className="text-slate-400">Licitante:</strong> {contract.contractor}
            </span>
            <span>
              <strong className="text-slate-400">Valor:</strong> {formatCurrency(contract.value)}
            </span>
            <span>
              <strong className="text-slate-400">Modalidad:</strong> {contract.procurementMethod}
            </span>
            {contract.moneyAdditionPercentage > 0 && (
              <span className={`px-1.5 py-0.5 rounded font-bold ${contract.moneyAdditionPercentage > 50 ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400'}`}>
                +{contract.moneyAdditionPercentage}% Adición
              </span>
            )}
          </div>
        </div>

        {/* Barra de Selección de Enfoque */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-1">
              Enfoque Pericial:
            </span>
            <button
              onClick={() => setAuditFocus('forensic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                auditFocus === 'forensic'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>⚖️</span> Forense y Legal (Penal / Fiscal / Disciplinario)
            </button>
            <button
              onClick={() => setAuditFocus('preventive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                auditFocus === 'preventive'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>🛡️</span> Preventiva (Pliegos Sastre y Requisitos)
            </button>
            <button
              onClick={() => setAuditFocus('dissuasive')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                auditFocus === 'dissuasive'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <span>📢</span> Disuasiva (Veeduría Cívica)
            </button>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="btn-primary bg-purple-600 hover:bg-purple-700 text-xs py-1.5 px-4 whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5 self-end sm:self-auto"
          >
            <BoltIcon className="w-4 h-4" />
            {isAuditing ? 'Auditando con FAEPP...' : reportText ? 'Reauditar Proceso' : 'Ejecutar Dictamen Forense'}
          </button>
        </div>

        {/* Área de Resultados y Dictamen Pericial */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {!reportText && !isAuditing && !error && (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <BoltIcon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Auditoría Forense con Extremo Escepticismo Profesional
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 max-w-lg mx-auto leading-relaxed">
                El motor FAEPP somete el proceso contractual a los módulos de verificación de:
                <br />
                <strong>Módulo A</strong> (Colusión, proformas falsas y empresas de papel),{' '}
                <strong>Módulo B</strong> (Pliegos sastre y direccionamiento) y{' '}
                <strong>Módulo C</strong> (Anticipos, sobrecostos y desfase físico-financiero).
              </p>
              <button
                onClick={handleRunAudit}
                className="mt-4 btn-primary bg-purple-600 hover:bg-purple-700 text-xs py-2 px-5 inline-flex items-center gap-2"
              >
                <BoltIcon className="w-4 h-4" />
                Iniciar Dictamen Pericial Ahora
              </button>
            </div>
          )}

          {isAuditing && (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200 p-6">
              <div className="animate-spin text-3xl mb-3 inline-block">⚖️</div>
              <h4 className="text-sm font-bold text-slate-800">
                FAEPP: Ejecutando Protocolos de Auditoría Forense...
              </h4>
              <div className="text-xs text-slate-500 mt-2 space-y-1">
                <p>• Cotejando modalidades de contratación y límites legales de menor cuantía...</p>
                <p>• Examinando historial de adiciones presupuestales y riesgo de Contrato Avispa...</p>
                <p>• Elaborando Matriz Estandarizada de Hallazgos (Criterio, Condición, Causa y Efecto)...</p>
                <p>• Tipificando responsabilidades penales, fiscales y disciplinarias...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
              <div className="flex items-center gap-2 font-bold mb-1">
                <WarningIcon className="w-4 h-4 text-rose-600" />
                Error durante la auditoría forense
              </div>
              <p>{error}</p>
              <button
                onClick={handleRunAudit}
                className="mt-2 text-rose-700 font-semibold underline hover:no-underline"
              >
                Reintentar auditoría
              </button>
            </div>
          )}

          {reportText && !isAuditing && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Dictamen Pericial Oficial Generado
                  </h3>
                </div>
                <button
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 flex items-center gap-1.5"
                >
                  <span>📋</span>
                  {copied ? '¡Copiado al portapapeles!' : 'Copiar Dictamen para Denuncia'}
                </button>
              </div>

              <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {reportText}
              </div>
            </div>
          )}
        </div>

        {/* Pie con Acciones */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Estatuto Anticorrupción Ley 1474/2011 • Veedurías Ciudadanas Ley 850/2003
          </span>
          <div className="flex items-center gap-2">
            {reportText && (
              <button
                onClick={handleCopyReport}
                className="px-3 py-1.5 rounded text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200"
              >
                {copied ? 'Copiado' : 'Copiar Informe'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ForensicAuditModal);
