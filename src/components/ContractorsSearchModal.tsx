import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RealContract, Contract } from '../utils/types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  fetchContractsByContractor,
  fetchContractsByEntityName,
  mapRealContractToContract,
} from '../services/datosGovService';
import {
  evaluateContractorRisk,
  evaluateEntityRisk,
  type CompanyRiskProfile,
  type EntityRiskProfile,
} from '../services/forensicCompanyService';
import { XIcon, SearchIcon, BuildingOfficeIcon, BoltIcon, WarningIcon } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectContract?: (contract: Contract) => void;
  onForensicAudit?: (contract: Contract) => void;
}

type TabType = 'entidades' | 'contratistas';

const SUGGESTED_ENTITIES = [
  'Alcaldía de Montería',
  'Gobernación del Atlántico',
  'Gobernación de Bolívar',
  'Alcaldía de Valledupar',
  'Alcaldía de Santa Marta',
  'Gobernación de Córdoba',
  'Alcaldía de Pereira',
  'Gobernación de Caldas',
  'Gobernación de Sucre',
  'Alcaldía de Riohacha',
];

const SUGGESTED_CONTRACTORS = [
  'Consorcio',
  'Unión Temporal',
  'Constructora',
  'Ingeniería',
  'Logística',
  'Distribuciones',
];

const ContractorsSearchModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSelectContract,
  onForensicAudit,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('entidades');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchedName, setSearchedName] = useState('');
  const [entityProfile, setEntityProfile] = useState<EntityRiskProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyRiskProfile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  const handleSearch = useCallback(
    async (term?: string) => {
      const query = (term !== undefined ? term : searchTerm).trim();
      if (!query || query.length < 3) return;

      setIsLoading(true);
      setSearchedName(query);

      try {
        if (activeTab === 'entidades') {
          const contracts = await fetchContractsByEntityName(query, 120);
          const profile = evaluateEntityRisk(query, contracts);
          setEntityProfile(profile);
          setCompanyProfile(null);
        } else {
          const contracts = await fetchContractsByContractor(query, 120);
          const profile = evaluateContractorRisk(query, contracts);
          setCompanyProfile(profile);
          setEntityProfile(null);
        }
      } catch (err) {
        console.error('Error buscando contratante/contratista:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [activeTab, searchTerm],
  );

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchTerm('');
    setSearchedName('');
    setEntityProfile(null);
    setCompanyProfile(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="search-contractors-title">
      <div className="modal-content max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 id="search-contractors-title" className="text-base font-bold text-slate-900">
                Auditoría de Contratantes con el Estado y Empresas Licitantes
              </h2>
              <p className="text-xs text-slate-500">
                Búsqueda nacional de entidades públicas compradoras y contratistas en SECOP II
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 gap-2 text-xs font-semibold">
          <button
            onClick={() => handleTabChange('entidades')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'entidades'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏛️</span> Entidades Contratantes (Ordenadores del Gasto)
          </button>
          <button
            onClick={() => handleTabChange('contratistas')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'contratistas'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🏢</span> Empresas Licitantes (Detector de Empresas de Papel)
          </button>
        </div>

        {/* Barra de Búsqueda y Sugerencias */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'entidades'
                    ? 'Escribe el nombre de la entidad pública (ej. Alcaldía de Montería, Gobernación del Atlántico)...'
                    : 'Escribe el nombre o razón social de la empresa licitante (ej. Consorcio, Constructora)...'
                }
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || searchTerm.trim().length < 3}
              className="btn-primary text-xs py-2 px-4 whitespace-nowrap disabled:opacity-50 flex items-center gap-1.5"
            >
              <SearchIcon className="w-4 h-4" />
              {isLoading ? 'Auditando...' : 'Consultar'}
            </button>
          </form>

          {/* Sugerencias Rápidas */}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Sugerencias:
            </span>
            {(activeTab === 'entidades' ? SUGGESTED_ENTITIES : SUGGESTED_CONTRACTORS).map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => {
                  setSearchTerm(sug);
                  handleSearch(sug);
                }}
                className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors border border-slate-200"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {isLoading && (
            <div className="text-center py-16">
              <div className="animate-spin text-3xl mb-3 inline-block">⏳</div>
              <p className="text-sm font-semibold text-slate-700">
                Consultando contratación estatal en SECOP II...
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Extrayendo registros, cruzando oferentes y evaluando alertas de riesgo forense.
              </p>
            </div>
          )}

          {!isLoading && !entityProfile && !companyProfile && (
            <div className="text-center py-16 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <SearchIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">
                {activeTab === 'entidades'
                  ? 'Realiza una auditoría a cualquier entidad compradora del Estado'
                  : 'Verifica la integridad de empresas licitantes y detecta consorcios de papel'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Ingresa al menos 3 caracteres o haz clic en las sugerencias para cargar su historial contractual, concentración presupuestal y alertas legales en tiempo real.
              </p>
            </div>
          )}

          {/* PERFIL DE ENTIDAD PÚBLICA */}
          {!isLoading && entityProfile && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    Entidad Pública Compradora
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{searchedName}</h3>
                  <p className="text-xs text-slate-500">Muestra auditada en SECOP II: {entityProfile.totalContracts} contratos</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Índice de Integridad</p>
                    <p className={`text-xl font-black ${
                      entityProfile.integrityScore < 40
                        ? 'text-rose-600'
                        : entityProfile.integrityScore < 70
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {entityProfile.integrityScore} / 100
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    entityProfile.riskLevel === 'Crítico'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : entityProfile.riskLevel === 'Alto'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    Riesgo {entityProfile.riskLevel}
                  </span>
                </div>
              </div>

              {/* Tarjetas de Estadísticas de la Entidad */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Presupuesto Total</p>
                  <p className="text-sm font-bold text-blue-700 mt-1">{formatCurrency(entityProfile.totalValue)}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Total Contratos</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{entityProfile.totalContracts}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Contratación Directa</p>
                  <p className={`text-lg font-bold mt-1 ${entityProfile.directPercentage > 50 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {entityProfile.directPercentage.toFixed(0)}%
                  </p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Contratos Avispa (&gt;50%)</p>
                  <p className={`text-lg font-bold mt-1 ${entityProfile.avispaContractsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {entityProfile.avispaContractsCount}
                  </p>
                </div>
              </div>

              {/* Banderas Rojas de la Entidad */}
              {entityProfile.redFlags.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <WarningIcon className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Señales de Alerta Detectadas en la Entidad
                    </h4>
                  </div>
                  <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside">
                    {entityProfile.redFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top Contratistas que acaparan el presupuesto */}
              {entityProfile.topContractors.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Top Proveedores con Mayor Acaparamiento Contractual
                  </h4>
                  <div className="space-y-2.5">
                    {entityProfile.topContractors.map((cont, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800">{cont.name}</p>
                            <p className="text-[11px] text-slate-500">{cont.count} contrato(s) adjudicado(s)</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-800">{formatCurrency(cont.value)}</p>
                          <p className="text-[11px] font-semibold text-blue-600">{cont.percentage.toFixed(1)}% del total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PERFIL DE EMPRESA LICITANTE / CONTRATISTA */}
          {!isLoading && companyProfile && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                      Empresa Licitante / Proveedor
                    </span>
                    {companyProfile.nit && (
                      <span className="text-xs font-mono text-slate-500">NIT: {companyProfile.nit}</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{searchedName}</h3>
                  <p className="text-xs text-slate-500">Contratos auditados: {companyProfile.totalContracts}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Riesgo Empresa de Papel</p>
                    <p className={`text-xl font-black ${
                      companyProfile.shellCompanyScore >= 70
                        ? 'text-rose-600'
                        : companyProfile.shellCompanyScore >= 45
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {companyProfile.shellCompanyScore} / 100
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    companyProfile.shellCompanyScore >= 70
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : companyProfile.shellCompanyScore >= 45
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {companyProfile.riskLevel}
                  </span>
                </div>
              </div>

              {/* Tarjetas de Métricas Forenses de la Empresa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Valor Acumulado</p>
                  <p className="text-sm font-bold text-blue-700 mt-1">{formatCurrency(companyProfile.totalValue)}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Tasa Dedo / Directa</p>
                  <p className={`text-lg font-bold mt-1 ${companyProfile.directPercentage > 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {companyProfile.directPercentage.toFixed(0)}%
                  </p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Monodependencia</p>
                  <p className={`text-lg font-bold mt-1 ${companyProfile.singleEntityDependencyPct > 60 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {companyProfile.singleEntityDependencyPct.toFixed(0)}%
                  </p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-slate-500">Contratos Avispa</p>
                  <p className={`text-lg font-bold mt-1 ${companyProfile.avispaContractsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {companyProfile.avispaContractsCount}
                  </p>
                </div>
              </div>

              {/* Banderas Rojas del Contratista */}
              {companyProfile.redFlags.length > 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <WarningIcon className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Hallazgos de Sospecha / Factores de Riesgo
                    </h4>
                  </div>
                  <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside">
                    {companyProfile.redFlags.map((flag, idx) => (
                      <li key={idx}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recomendaciones Periciales */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 font-bold">🔍</span>
                  <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                    Protocolo Forense Recomendado para Veeduría
                  </h4>
                </div>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  {companyProfile.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>

              {/* Listado de Contratos de la Empresa con Acción Forense */}
              {companyProfile.contracts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Historial de Contratos Obtenidos con el Estado ({companyProfile.contracts.length})
                  </h4>
                  <div className="space-y-3">
                    {companyProfile.contracts.slice(0, 15).map((c) => {
                      const mapped = mapRealContractToContract(c);
                      return (
                        <div
                          key={c.id_contrato || c.referencia_del_contrato}
                          className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors bg-slate-50/50"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 leading-tight">
                                {c.objeto_del_contrato || 'Sin objeto detallado'}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                {c.nombre_entidad} • {c.modalidad_de_contratacion} • {formatDate(c.fecha_de_firma || '')}
                              </p>
                            </div>
                            <div className="sm:text-right shrink-0">
                              <p className="text-xs font-bold text-slate-800">
                                {formatCurrency(Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0)}
                              </p>
                              {c.valor_total_con_adiciones && Number(c.valor_total_con_adiciones) > Number(c.valor_contrato) && (
                                <p className="text-[10px] text-rose-600 font-semibold">
                                  Con adición: {formatCurrency(Number(c.valor_total_con_adiciones))}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <span className="text-[11px] font-mono text-slate-400">
                              ID: {c.id_contrato || c.referencia_del_contrato}
                            </span>
                            <div className="flex items-center gap-2">
                              {onSelectContract && (
                                <button
                                  onClick={() => onSelectContract(mapped)}
                                  className="text-xs font-semibold text-slate-600 hover:text-blue-600"
                                >
                                  Ver Ficha
                                </button>
                              )}
                              {onForensicAudit && (
                                <button
                                  onClick={() => onForensicAudit(mapped)}
                                  className="text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                                >
                                  <BoltIcon className="w-3.5 h-3.5" />
                                  Auditoría Forense FAEPP
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex justify-end p-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ContractorsSearchModal);
