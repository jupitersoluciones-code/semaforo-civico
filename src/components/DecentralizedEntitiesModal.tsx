import React, { useState, useMemo, useEffect } from 'react';
import type { RealContract, Contract, Department, Municipality, DecentralizedEntityId } from '../utils/types';
import { DECENTRALIZED_ENTITIES } from '../utils/constants';
import { fetchContractsByDecentralizedEntity, fetchContractsByContractor } from '../services/datosGovService';
import { analyzeRealContracts, getSemaphoreStats } from '../services/semaforoService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { XIcon, SearchIcon, BuildingOfficeIcon } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  municipalities: Municipality[];
  initialDepartment: string;
  initialMunicipality: string;
  initialEntityId?: DecentralizedEntityId;
  onViewDetailsClick: (contract: Contract) => void;
  onAlertClick?: (contract: Contract) => void;
}

const DecentralizedEntitiesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  departments,
  municipalities,
  initialDepartment,
  initialMunicipality,
  initialEntityId = 'ese_hospital',
  onViewDetailsClick,
  onAlertClick,
}) => {
  const [selectedEntity, setSelectedEntity] = useState<DecentralizedEntityId>(
    initialEntityId === 'all' ? 'ese_hospital' : initialEntityId,
  );
  const [selectedDept, setSelectedDept] = useState(initialDepartment);
  const [selectedMun, setSelectedMun] = useState(initialMunicipality);
  const [searchTerm, setSearchTerm] = useState('');
  const [contracts, setContracts] = useState<RealContract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para la búsqueda directa de contratistas en SECOP II
  const [contractorSearchActive, setContractorSearchActive] = useState(false);
  const [searchedContractorQuery, setSearchedContractorQuery] = useState('');
  const [contractorContracts, setContractorContracts] = useState<RealContract[]>([]);
  const [isContractorLoading, setIsContractorLoading] = useState(false);
  const [contractorError, setContractorError] = useState<string | null>(null);

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (initialDepartment) setSelectedDept(initialDepartment);
      if (initialMunicipality) setSelectedMun(initialMunicipality);
      if (initialEntityId && initialEntityId !== 'all') {
        setSelectedEntity(initialEntityId);
      }
    }
  }, [isOpen, initialDepartment, initialMunicipality, initialEntityId]);

  // Cargar contratos de la entidad seleccionada en la ubicación
  useEffect(() => {
    if (!isOpen || !selectedDept) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchContractsByDecentralizedEntity(selectedEntity, selectedDept, selectedMun, 150)
      .then((data) => {
        if (isMounted) {
          setContracts(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error cargando contratos de entidad descentralizada:', err);
          setError('No fue posible consultar Datos Abiertos para esta entidad en este momento.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedEntity, selectedDept, selectedMun]);

  const handleSearchContractor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      handleClearContractorSearch();
      return;
    }

    setIsContractorLoading(true);
    setContractorError(null);
    setContractorSearchActive(true);
    setSearchedContractorQuery(query);

    try {
      const results = await fetchContractsByContractor(query, 150);
      setContractorContracts(results);
    } catch (err) {
      console.error('Error al consultar contratos del contratista:', err);
      setContractorError('No fue posible consultar el historial del contratista en SECOP II en este momento.');
    } finally {
      setIsContractorLoading(false);
    }
  };

  const handleClearContractorSearch = () => {
    setContractorSearchActive(false);
    setSearchedContractorQuery('');
    setContractorContracts([]);
    setContractorError(null);
    setSearchTerm('');
  };

  const currentEntityDef = useMemo(
    () => DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity) || DECENTRALIZED_ENTITIES[0],
    [selectedEntity],
  );

  const activeRawContracts = useMemo(() => {
    return contractorSearchActive ? contractorContracts : contracts;
  }, [contractorSearchActive, contractorContracts, contracts]);

  const analyzedContracts = useMemo(() => {
    return analyzeRealContracts(activeRawContracts);
  }, [activeRawContracts]);

  const stats = useMemo(() => {
    const totalValue = activeRawContracts.reduce((acc, c) => {
      const val = Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0;
      return acc + val;
    }, 0);
    const semStats = getSemaphoreStats(analyzedContracts);
    return {
      total: activeRawContracts.length,
      totalValue,
      semStats,
    };
  }, [activeRawContracts, analyzedContracts]);

  const filteredContracts = useMemo(() => {
    if (contractorSearchActive) {
      return analyzedContracts;
    }
    if (!searchTerm.trim()) return analyzedContracts;
    const term = searchTerm.toLowerCase();
    return analyzedContracts.filter((c) => {
      return (
        (c.name || '').toLowerCase().includes(term) ||
        (c.contractor || '').toLowerCase().includes(term) ||
        (c.entityName || '').toLowerCase().includes(term) ||
        (c.id || '').toLowerCase().includes(term)
      );
    });
  }, [analyzedContracts, searchTerm, contractorSearchActive]);

  if (!isOpen) return null;

  const currentDeptName = departments.find((d) => d.code === selectedDept)?.name || selectedDept;
  const currentMunName = municipalities.find((m) => m.code === selectedMun)?.name || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl shadow-inner border border-white/10">
              {currentEntityDef.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="modal-title" className="text-xl font-bold text-white">
                  Auditoría a Entidades Descentralizadas
                </h2>
                <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30 font-medium">
                  SECOP II Oficial
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Vigilancia ciudadana a E.S.E. Hospitales, SENA, ICA, ANT, INDER y AUNAP en territorio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar modal"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Pestañas de entidades */}
        <div className="bg-slate-100 px-5 pt-3 border-b border-slate-200 flex gap-2 overflow-x-auto">
          {DECENTRALIZED_ENTITIES.map((ent) => {
            const isActive = selectedEntity === ent.id;
            return (
              <button
                key={ent.id}
                onClick={() => {
                  setSelectedEntity(ent.id);
                  handleClearContractorSearch();
                }}
                className={`px-4 py-2.5 rounded-t-lg font-semibold text-xs transition-all whitespace-nowrap flex items-center gap-2 border-t-2 ${
                  isActive
                    ? 'bg-white text-indigo-700 border-indigo-600 shadow-sm'
                    : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className="text-base">{ent.icon}</span>
                <span>{ent.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Barra de filtros de ubicación contextual y búsqueda de contratistas */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>📍 Ubicación:</span>
            </div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedMun('');
                handleClearContractorSearch();
              }}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">-- Selecciona Departamento --</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMun}
              onChange={(e) => {
                setSelectedMun(e.target.value);
                handleClearContractorSearch();
              }}
              disabled={!selectedDept}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-200"
            >
              <option value="">🏛️ Todo el departamento</option>
              {municipalities.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Formulario de Búsqueda de Contratista */}
          <form onSubmit={handleSearchContractor} className="flex items-center gap-2 flex-1 min-w-[280px] max-w-md">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nombre o NIT del contratista a auditar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-7 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder-slate-400"
              />
              {(searchTerm || contractorSearchActive) && (
                <button
                  type="button"
                  onClick={handleClearContractorSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isContractorLoading || !searchTerm.trim()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Buscar historial completo de este contratista en SECOP II"
            >
              {isContractorLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <SearchIcon className="w-3.5 h-3.5" />
                  <span>Buscar</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Resumen de métricas y semáforos */}
        <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Contratos Encontrados
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-800">{stats.total}</span>
              <span className="text-xs text-slate-500">
                {currentMunName ? currentMunName : currentDeptName}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Monto Total Adjudicado
            </span>
            <span className="text-lg font-bold text-slate-800 block mt-1 truncate" title={formatCurrency(stats.totalValue)}>
              {formatCurrency(stats.totalValue)}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl col-span-2 flex items-center justify-around gap-2">
            <div className="text-center">
              <span className="text-xs font-semibold text-emerald-700 block">🟢 Bajo Riesgo</span>
              <span className="text-lg font-bold text-emerald-800">{stats.semStats.green}</span>
            </div>
            <div className="text-center border-x border-slate-200 px-4">
              <span className="text-xs font-semibold text-amber-700 block">🟡 Alerta Media</span>
              <span className="text-lg font-bold text-amber-800">{stats.semStats.yellow}</span>
            </div>
            <div className="text-center">
              <span className="text-xs font-semibold text-rose-700 block">🔴 Alto Riesgo</span>
              <span className="text-lg font-bold text-rose-800">{stats.semStats.red}</span>
            </div>
          </div>
        </div>

        {/* Listado de Contratos */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {contractorSearchActive && isContractorLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Consultando historial de contratos para &ldquo;{searchedContractorQuery}&rdquo; en SECOP II...
              </p>
              <p className="text-xs text-slate-400 mt-1">Rastreando todas las adjudicaciones registradas en Datos Abiertos Colombia</p>
            </div>
          ) : contractorSearchActive && contractorError ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 max-w-md mx-auto my-8">
              <span className="text-2xl block mb-2">⚠️</span>
              <h4 className="font-bold text-sm">Error en la consulta del contratista</h4>
              <p className="text-xs mt-1">{contractorError}</p>
              <button
                type="button"
                onClick={handleClearContractorSearch}
                className="mt-4 px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 cursor-pointer"
              >
                Volver a contratos de la entidad
              </button>
            </div>
          ) : contractorSearchActive && contractorContracts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h4 className="text-base font-bold text-slate-700">
                No se encontraron contratos registrados para el contratista &ldquo;{searchedContractorQuery}&rdquo;
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No se encontraron contratos adjudicados en la base de datos oficial de SECOP II con ese nombre o razón social.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleClearContractorSearch}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                >
                  <span>Volver a contratos de {currentEntityDef.shortName}</span>
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent mb-3" />
              <p className="text-sm font-medium text-slate-600">
                Consultando contratos de {currentEntityDef.name} en SECOP II...
              </p>
              <p className="text-xs text-slate-400 mt-1">Conectando con la base oficial de Datos Abiertos Colombia</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 max-w-md mx-auto my-8">
              <span className="text-2xl block mb-2">⚠️</span>
              <h4 className="font-bold text-sm">Error en la consulta</h4>
              <p className="text-xs mt-1">{error}</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h4 className="text-base font-bold text-slate-700">
                No se encontraron contratos registrados para {currentEntityDef.shortName}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                En {currentMunName ? `${currentMunName} (${currentDeptName})` : currentDeptName}, no se registran contratos en SECOP II bajo los criterios específicos de esta entidad.
              </p>
              {selectedMun && (
                <div className="mt-4">
                  <p className="text-[11px] text-slate-400 mb-2">
                    La búsqueda está aislada estrictamente a {currentMunName} para evitar confusiones con otros municipios.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedMun('')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 transition-colors"
                  >
                    <span>🏛️</span>
                    <span>Ver contratos de {currentEntityDef.shortName} en todo el departamento ({currentDeptName})</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {contractorSearchActive ? (
                <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/50 rounded-xl text-white shadow-sm mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl">💼</span>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        Historial del Contratista: <span className="text-amber-300 underline">{searchedContractorQuery}</span>
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        SECOP II Oficial
                      </span>
                    </div>
                    <p className="text-xs text-indigo-200">
                      Se encontraron <strong>{contractorContracts.length} contratos históricos</strong> adjudicados a este contratista en la base de datos nacional. Puedes auditar contrato por contrato haciendo clic en <strong>Ver Expediente</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearContractorSearch}
                    className="self-start sm:self-center px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg border border-white/20 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>✕</span>
                    <span>Volver a contratos de la entidad</span>
                  </button>
                </div>
              ) : selectedMun ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5 mb-3">
                  <span className="text-lg shrink-0">🏥</span>
                  <div>
                    <span className="font-bold">Auditoría Exclusiva Municipal:</span>{' '}
                    Mostrando únicamente contratos correspondientes al hospital o entidad de{' '}
                    <strong>{currentMunName}</strong> ({currentDeptName}). Los contratos de otros municipios han sido excluidos.
                  </div>
                </div>
              ) : null}
              {filteredContracts.map((c) => {
                const statusColor =
                  c.status === 'Verde'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : c.status === 'Amarillo'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200';

                return (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono">
                          {c.id}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${statusColor}`}>
                          Semáforo {c.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {c.procurementMethod}
                        </span>
                      </div>

                      <h4
                        className="font-semibold text-slate-800 text-sm line-clamp-2 cursor-pointer hover:text-indigo-600 transition-colors"
                        title={c.name}
                        onClick={() => onViewDetailsClick(c)}
                        role="button"
                        tabIndex={0}
                      >
                        {c.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span>
                          <strong className="text-slate-700">Entidad:</strong> {c.entityName || 'Entidad Oficial'}
                        </span>
                        <span>
                          <strong className="text-slate-700">Contratista:</strong> {c.contractor}
                        </span>
                        {c.startDate && (
                          <span>
                            <strong className="text-slate-700">Firma:</strong> {formatDate(c.startDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[11px] font-medium text-slate-500 block">Valor Contrato</span>
                        <span className="text-base font-bold text-slate-900 font-mono">
                          {formatCurrency(c.value)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onAlertClick && (
                          <button
                            type="button"
                            onClick={() => onAlertClick(c)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Reportar anomalía ciudadana"
                          >
                            🚨 Alerta
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewDetailsClick(c)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          Ver Expediente
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Mostrando {filteredContracts.length} de {contracts.length} contratos auditados.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
          >
            Cerrar Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecentralizedEntitiesModal;
