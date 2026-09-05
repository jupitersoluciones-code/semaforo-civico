import React, { useEffect, useState, useRef } from 'react';
import type { Contract } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { XIcon, BoltIcon, BuildingOfficeIcon } from './Icons';
import { fetchContractAudit } from '../services/cerocorrupcionService';
import SemaphoreIndicator from './SemaphoreIndicator';

interface Props {
  contract: Contract;
  onClose: () => void;
  onAlertClick: (contract: Contract) => void;
  onComparePricesClick: (contract: Contract) => void;
  onAIClick?: (contract: Contract) => void;
}

type TabType = 'resumen' | 'dependencia' | 'pliegos' | 'auditoria';

const ContractDetailsModal: React.FC<Props> = ({
  contract,
  onClose,
  onAlertClick,
  onComparePricesClick,
  onAIClick,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [audit, setAudit] = useState<{ riskScore: number; analysis: string } | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
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
    if (contract.id) {
      setIsLoadingAudit(true);
      fetchContractAudit(contract.id)
        .then(setAudit)
        .finally(() => setIsLoadingAudit(false));
    }
  }, [contract.id]);

  const hasAvispaRisk = contract.moneyAdditionPercentage > 50 || contract.timeAdditionPercentage > 50;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="modal-content max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <SemaphoreIndicator status={contract.status} size="md" />
            <div>
              <h2 id="detail-title" className="text-base font-bold text-slate-900 leading-tight">
                Expediente y Auditoría del Contrato
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ID SECOP: <span className="font-mono font-medium text-slate-700">{contract.id}</span>
                {contract.processNumber && contract.processNumber !== contract.id && (
                  <span className="ml-2 font-mono">| Proceso: {contract.processNumber}</span>
                )}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Pestañas de Navegación */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('resumen')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'resumen'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📊</span> Resumen Contractual
          </button>

          <button
            onClick={() => setActiveTab('dependencia')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'dependencia'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏛️</span> Dependencia y Despacho
          </button>

          <button
            onClick={() => setActiveTab('pliegos')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'pliegos'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📑</span> Estudios Previos y Pliego
          </button>

          <button
            onClick={() => setActiveTab('auditoria')}
            className={`py-3 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'auditoria'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-purple-900'
            }`}
          >
            <span>🤖</span> Auditoría IA
          </button>
        </div>

        {/* Contenedor con Scroll de las Pestañas */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Objeto Contractual Visible en Todas las Pestañas */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Objeto del Contrato
            </span>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              {contract.name}
            </p>
          </div>

          {/* PESTAÑA 1: RESUMEN Y SEMÁFORO */}
          {activeTab === 'resumen' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <span className="text-[11px] text-slate-500 block">Contratista Adjudicado</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{contract.contractor}</p>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <span className="text-[11px] text-slate-500 block">Valor del Contrato</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(contract.value)}</p>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <span className="text-[11px] text-slate-500 block">Modalidad Legal</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{contract.procurementMethod}</p>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <span className="text-[11px] text-slate-500 block">Fecha de Inicio</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{formatDate(contract.startDate) || 'No especificada'}</p>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <span className="text-[11px] text-slate-500 block">Fecha de Terminación</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{formatDate(contract.endDate) || 'En ejecución'}</p>
                </div>

                <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                  <span className="text-[11px] text-slate-500 block">Número de Oferentes</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">
                    {contract.numberOfBidders > 0 ? `${contract.numberOfBidders} proponente(s)` : 'Contratación Directa / Único'}
                  </p>
                </div>
              </div>

              {/* Barra de Ejecución */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center text-xs text-slate-600 mb-2">
                  <span className="font-semibold text-slate-700">Avance Estimado del Contrato</span>
                  <span className="font-bold text-sm text-slate-800">{contract.executionPercentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                  <div
                    className={`h-full transition-all duration-500 ${
                      contract.executionPercentage < 30
                        ? 'bg-rose-500'
                        : contract.executionPercentage <= 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${contract.executionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Alertas de Adición / Contrato Avispa */}
              {(contract.timeAdditionPercentage > 0 || contract.moneyAdditionPercentage > 0) && (
                <div className={`p-4 rounded-xl border ${hasAvispaRisk ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{hasAvispaRisk ? '🚨' : '⚠️'}</span>
                    <h4 className={`text-xs font-bold ${hasAvispaRisk ? 'text-rose-900' : 'text-amber-900'}`}>
                      {hasAvispaRisk ? 'Alerta Contrato Avispa (Supera el 50% legal de adición)' : 'Adiciones y Prórrogas Registradas'}
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Prórroga en Plazo:</span>
                      <span className="font-bold text-slate-800">+{contract.timeAdditionPercentage}% de tiempo adicional</span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Adición Presupuestal:</span>
                      <span className={`font-bold ${contract.moneyAdditionPercentage > 50 ? 'text-rose-600' : 'text-slate-800'}`}>
                        +{contract.moneyAdditionPercentage}% sobre valor original
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: DEPENDENCIA, SECRETARÍA Y DESPACHO */}
          {activeTab === 'dependencia' && (
            <div className="space-y-4">
              {/* Tarjeta Destacada: Secretaría o Despacho */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg shrink-0">
                    <BuildingOfficeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-700 block">
                      Dependencia / Secretaría Responsable de la Adjudicación
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {contract.departmentAgency || 'Despacho Central de Contratación Municipal'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Unidad ejecutora encargada de estructurar, liderar la contratación y responder por el cumplimiento de las metas territoriales.
                    </p>
                  </div>
                </div>
              </div>

              {/* Responsables Institucionales: Ordenador del Gasto y Supervisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    🖋️ Ordenador del Gasto
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {contract.spendingOfficer || 'No especificado en el registro'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Funcionario público con delegación y firma que autorizó el compromiso presupuestal y el CDP.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    👁️ Supervisor / Interventor Designado
                  </span>
                  <p className="text-xs font-bold text-slate-800">
                    {contract.supervisor || 'Supervisión directa de la entidad'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Encargado de vigilar técnica, jurídica y financieramente la correcta ejecución del objeto contratado.
                  </p>
                </div>
              </div>

              {/* Información Institucional de la Entidad */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Entidad Pública Contratante
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-slate-500">Nombre Oficial:</span>{' '}
                    <span className="font-semibold text-slate-800">{contract.entityName || 'Entidad territorial'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">NIT de la Entidad:</span>{' '}
                    <span className="font-mono font-medium text-slate-800">{contract.entityNit || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sector Administrativo:</span>{' '}
                    <span className="font-medium text-slate-700">{contract.sector || 'Administración pública'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Rama del Poder Público:</span>{' '}
                    <span className="font-medium text-slate-700">{contract.branch || 'Ejecutivo Territorial'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: ESTUDIOS PREVIOS Y PLIEGO DE LICITACIÓN */}
          {activeTab === 'pliegos' && (
            <div className="space-y-4">
              {/* Justificación de la Modalidad y Estudios Previos */}
              <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⚖️</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Justificación de la Modalidad y Necesidad (Estudios Previos)
                  </h4>
                </div>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-wrap">
                  {contract.justification ||
                    'La justificación técnica, legal y económica fue estructurada en los estudios previos y documentos de conveniencia y oportunidad radicados en SECOP II para respaldar la idoneidad del objeto y la modalidad seleccionada.'}
                </p>
              </div>

              {/* Especificaciones Presupuestales del Pliego */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    💰 Origen de los Recursos
                  </span>
                  <p className="text-xs font-semibold text-slate-800">
                    {contract.fundingSource || 'Recursos Propios Municipales / SGP'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fondos asignados mediante Certificado de Disponibilidad Presupuestal (CDP).
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-sm">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    🎯 Destino del Gasto
                  </span>
                  <p className="text-xs font-semibold text-slate-800">
                    {contract.expenseDestination || 'Inversión'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Clasificación presupuestal entre gasto social/infraestructura (Inversión) o nómina/operación (Funcionamiento).
                  </p>
                </div>
              </div>

              {/* Tarjeta de Acceso al Expediente Oficial en SECOP II */}
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 rounded-2xl shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-400/30">
                      <span>🏛️</span> Expediente Digital Oficial SECOP II
                    </div>
                    <h3 className="text-sm font-bold text-white">
                      Documentación Completa Precontractual y Contractual
                    </h3>
                    <p className="text-xs text-slate-300 max-w-lg leading-relaxed">
                      En el enlace oficial de SECOP II podrás consultar y descargar directamente los PDFs de:
                    </p>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside mt-1">
                      <li>Estudios previos, análisis del sector y cotizaciones de mercado.</li>
                      <li>Pliego de condiciones definitivo, anexos técnicos y matriz de riesgos.</li>
                      <li>Adendas, observaciones de oferentes y acta de adjudicación.</li>
                      <li>Minuta del contrato firmada y aprobación de pólizas de seguros.</li>
                    </ul>
                  </div>

                  <div className="shrink-0 self-start sm:self-center">
                    {contract.processUrl ? (
                      <a
                        href={contract.processUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:shadow-blue-500/25 whitespace-nowrap"
                      >
                        <span>Abrir Expediente en SECOP II</span>
                        <span>↗</span>
                      </a>
                    ) : (
                      <a
                        href={`https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=${encodeURIComponent(contract.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                      >
                        <span>Buscar en SECOP II</span>
                        <span>↗</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: AUDITORÍA IA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0">
                    <BoltIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Asistente de Auditoría de Pliegos y Riesgos (Gemini 3.6 Flash)
                    </h3>
                    <p className="text-xs text-purple-800 mt-1">
                      Utiliza inteligencia artificial para auditar este contrato y detectar posibles banderas rojas, indicios de "pliego sastre", concentración o adiciones desproporcionadas.
                    </p>
                  </div>
                </div>

                {onAIClick && (
                  <div className="mt-3 pt-3 border-t border-purple-200 flex justify-end">
                    <button
                      onClick={() => onAIClick(contract)}
                      className="btn-primary bg-purple-600 hover:bg-purple-700 text-xs py-2 px-4 flex items-center gap-2"
                    >
                      <BoltIcon className="w-4 h-4" />
                      Auditar Pliegos y Riesgos con IA
                    </button>
                  </div>
                )}
              </div>

              {/* Análisis de Riesgo CeroCorrupción si está disponible */}
              {isLoadingAudit && (
                <div className="text-center py-8 text-xs text-slate-400">
                  <span className="animate-spin inline-block mr-1">⏳</span> Consultando auditoría de riesgo...
                </div>
              )}

              {audit && (
                <div
                  className={`p-4 rounded-xl border ${
                    audit.riskScore > 60
                      ? 'bg-rose-50 border-rose-200'
                      : audit.riskScore > 30
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Índice de Riesgo Territorial
                    </h4>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        audit.riskScore > 60
                          ? 'bg-rose-200 text-rose-800'
                          : audit.riskScore > 30
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-emerald-200 text-emerald-800'
                      }`}
                    >
                      Riesgo: {audit.riskScore}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{audit.analysis}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra de Acciones / Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            {contract.processUrl && (
              <a
                href={contract.processUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
              >
                <span>Expediente SECOP II</span>
                <span>↗</span>
              </a>
            )}
            <button
              onClick={() => onComparePricesClick(contract)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Comparar Precios
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onAlertClick(contract);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>📢</span> Generar Alerta
            </button>
            <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-4">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ContractDetailsModal);
