import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { RealContract, Contract, Department, Municipality, DecentralizedEntityId } from '../utils/types';
import { DECENTRALIZED_ENTITIES } from '../utils/constants';
import { fetchContractsByDecentralizedEntity, fetchContractsByContractor, fetchMunicipalitiesByDepartment } from '../services/datosGovService';
import { clearCacheForKey } from '../services/apiClient';
import { analyzeRealContracts, getSemaphoreStats } from '../services/semaforoService';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  XIcon, SearchIcon, BuildingOfficeIcon, LocationMarkerIcon, WarningIcon,
  HospitalIcon, GraduationIcon, LeafIcon, MapIcon, TrophyIcon, FishIcon,
  FlagIcon, BriefcaseIcon, ArrowRightIcon,
} from './Icons';
import type { DecentralizedEntityDef } from '../utils/types';

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

// Mapa de íconos SVG por entidad
const ENTITY_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  ese_hospital: HospitalIcon,
  sena: GraduationIcon,
  ica: LeafIcon,
  ant: MapIcon,
  inder: TrophyIcon,
  aunap: FishIcon,
};

// Paleta de colores de acento por entidad (fondo suave / texto)
const ENTITY_COLOR_MAP: Record<string, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  ese_hospital: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', activeBg: 'bg-rose-600', activeText: 'text-white' },
  sena: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-600', activeText: 'text-white' },
  ica: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-600', activeText: 'text-white' },
  ant: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-600', activeText: 'text-white' },
  inder: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', activeBg: 'bg-violet-600', activeText: 'text-white' },
  aunap: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', activeBg: 'bg-cyan-600', activeText: 'text-white' },
};

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

  const [contractorSearchActive, setContractorSearchActive] = useState(false);
  const [searchedContractorQuery, setSearchedContractorQuery] = useState('');
  const [contractorContracts, setContractorContracts] = useState<RealContract[]>([]);
  const [isContractorLoading, setIsContractorLoading] = useState(false);
  const [contractorError, setContractorError] = useState<string | null>(null);

  // Estado interno de municipios — se recarga cuando cambia el departamento seleccionado dentro del modal
  const [localMunicipalities, setLocalMunicipalities] = useState<Municipality[]>([]);
  const [isLoadingMunis, setIsLoadingMunis] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialDepartment) setSelectedDept(initialDepartment);
      if (initialMunicipality) setSelectedMun(initialMunicipality);
      if (initialEntityId && initialEntityId !== 'all') {
        setSelectedEntity(initialEntityId);
      }
    }
  }, [isOpen, initialDepartment, initialMunicipality, initialEntityId]);

  // Carga municipios cuando cambia el departamento seleccionado DENTRO del modal
  useEffect(() => {
    if (!selectedDept) {
      setLocalMunicipalities([]);
      return;
    }
    let active = true;
    setIsLoadingMunis(true);
    fetchMunicipalitiesByDepartment(selectedDept).then((muns) => {
      if (active) {
        setLocalMunicipalities(muns);
        setIsLoadingMunis(false);
      }
    });
    return () => { active = false; };
  }, [selectedDept]);

  // Carga contratos de la entidad descentralizada seleccionada
  const loadContracts = useCallback((entityId: DecentralizedEntityId, deptCode: string, munCode?: string) => {
    if (!deptCode) return;
    setIsLoading(true);
    setError(null);
    setContracts([]);
    fetchContractsByDecentralizedEntity(entityId, deptCode, munCode, 150)
      .then((data) => {
        setContracts(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando contratos de entidad descentralizada:', err);
        setError('No fue posible consultar Datos Abiertos para esta entidad en este momento.');
        setIsLoading(false);
      });
  }, []);

  // Dispara la carga de contratos al abrir el modal o cambiar filtros clave
  useEffect(() => {
    if (!isOpen || !selectedDept) return;
    loadContracts(selectedEntity, selectedDept, selectedMun || undefined);
  }, [isOpen, selectedEntity, selectedDept, selectedMun, loadContracts]);

  const handleSearchContractor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim();
    if (!query) { handleClearContractorSearch(); return; }

    setIsContractorLoading(true);
    setContractorError(null);
    setContractorSearchActive(true);
    setSearchedContractorQuery(query);

    try {
      const results = await fetchContractsByContractor(query, 150);
      setContractorContracts(results);
    } catch (err) {
      console.error('Error al consultar contratos del contratista:', err);
      setContractorError('No fue posible consultar el historial del contratista en SECOP II.');
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

  /** Fuerza reconsulta limpiando la caché para la combinación actual */
  const handleRetry = () => {
    // Limpiar las claves de caché conocidas para esta combinación
    const keysToInvalidate = [
      `decent_v6_strict_mun_${selectedEntity}_${selectedDept}_${selectedMun}_150`,
      `decent_v6_dept_${selectedEntity}_${selectedDept}_150`,
      `decent_v6_nat_${selectedEntity}_150`,
    ];
    keysToInvalidate.forEach(clearCacheForKey);
    setError(null);
    loadContracts(selectedEntity, selectedDept, selectedMun || undefined);
  };

  const currentEntityDef = useMemo(
    () => DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity) || DECENTRALIZED_ENTITIES[0],
    [selectedEntity],
  );

  const activeRawContracts = useMemo(
    () => contractorSearchActive ? contractorContracts : contracts,
    [contractorSearchActive, contractorContracts, contracts],
  );

  const analyzedContracts = useMemo(() => analyzeRealContracts(activeRawContracts), [activeRawContracts]);

  const stats = useMemo(() => {
    const totalValue = activeRawContracts.reduce((acc, c) => {
      return acc + (Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0);
    }, 0);
    const semStats = getSemaphoreStats(analyzedContracts);
    return { total: activeRawContracts.length, totalValue, semStats };
  }, [activeRawContracts, analyzedContracts]);

  const filteredContracts = useMemo(() => {
    if (contractorSearchActive) return analyzedContracts;
    if (!searchTerm.trim()) return analyzedContracts;
    const term = searchTerm.toLowerCase();
    return analyzedContracts.filter((c) =>
      (c.name || '').toLowerCase().includes(term) ||
      (c.contractor || '').toLowerCase().includes(term) ||
      (c.entityName || '').toLowerCase().includes(term) ||
      (c.id || '').toLowerCase().includes(term),
    );
  }, [analyzedContracts, searchTerm, contractorSearchActive]);

  if (!isOpen) return null;

  const currentDeptName = departments.find((d) => d.code === selectedDept)?.name || selectedDept;
  const currentMunName = municipalities.find((m) => m.code === selectedMun)?.name || '';
  const EntityIcon = ENTITY_ICON_MAP[selectedEntity] || BuildingOfficeIcon;
  const entityColors = ENTITY_COLOR_MAP[selectedEntity] || ENTITY_COLOR_MAP.ese_hospital;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* ── HEADER ── */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${entityColors.bg} ${entityColors.text} border ${entityColors.border}`}>
              <EntityIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="modal-title" className="text-base font-bold text-slate-900 tracking-tight">
                  Auditoría — Entidades Descentralizadas
                </h2>
                <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  SECOP II Oficial
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentEntityDef.name}
                {currentDeptName && (
                  <span className="text-slate-400"> — {currentMunName || currentDeptName}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── TABS DE ENTIDADES ── */}
        <div className="px-6 pt-3 pb-0 border-b border-slate-200 bg-slate-50 flex gap-1 overflow-x-auto">
          {DECENTRALIZED_ENTITIES.map((ent) => {
            const isActive = selectedEntity === ent.id;
            const EIcon = ENTITY_ICON_MAP[ent.id] || BuildingOfficeIcon;
            const eColors = ENTITY_COLOR_MAP[ent.id] || ENTITY_COLOR_MAP.ese_hospital;
            return (
              <button
                key={ent.id}
                onClick={() => { setSelectedEntity(ent.id); handleClearContractorSearch(); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-semibold text-xs whitespace-nowrap transition-all border-b-2 ${
                  isActive
                    ? `bg-white ${eColors.text} border-b-2 border-current shadow-sm`
                    : 'bg-transparent text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <EIcon className="w-3.5 h-3.5" />
                <span>{ent.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* ── BARRA DE FILTROS Y BÚSQUEDA ── */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center gap-3">
          {/* Ubicación */}
          <div className="flex items-center gap-2 shrink-0">
            <LocationMarkerIcon className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ubicación</span>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => { setSelectedDept(e.target.value); setSelectedMun(''); handleClearContractorSearch(); }}
            className="form-select text-xs py-1.5 max-w-[200px]"
          >
            <option value="">— Seleccionar departamento —</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedMun}
            onChange={(e) => { setSelectedMun(e.target.value); handleClearContractorSearch(); }}
            disabled={!selectedDept || isLoadingMunis}
            className="form-select text-xs py-1.5 max-w-[200px]"
          >
            <option value="">{isLoadingMunis ? 'Cargando municipios...' : 'Todo el departamento'}</option>
            {localMunicipalities.map((m) => (
              <option key={m.code} value={m.code}>{m.name}</option>
            ))}
          </select>

          {/* Separador */}
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Búsqueda de contratista */}
          <form onSubmit={handleSearchContractor} className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
            <div className="relative flex-1">
              <BriefcaseIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Auditar contratista por nombre o NIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-slate-400"
              />
              {(searchTerm || contractorSearchActive) && (
                <button
                  type="button"
                  onClick={handleClearContractorSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isContractorLoading || !searchTerm.trim()}
              className="btn-primary text-xs py-1.5 px-3 shrink-0"
            >
              {isContractorLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <SearchIcon className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{isContractorLoading ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </form>
        </div>

        {/* ── MÉTRICAS ── */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="stat-card">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Contratos encontrados
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-400 truncate">
                {currentMunName || currentDeptName || 'Nacional'}
              </span>
            </div>
          </div>

          <div className="stat-card">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Valor total adjudicado
            </span>
            <span
              className="text-lg font-bold text-slate-900 block mt-1 truncate"
              title={formatCurrency(stats.totalValue)}
            >
              {formatCurrency(stats.totalValue)}
            </span>
          </div>

          <div className="stat-card col-span-2 flex items-center justify-around">
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-[11px] font-semibold text-emerald-700">Bajo Riesgo</span>
              </div>
              <span className="text-xl font-bold text-emerald-800">{stats.semStats.green}</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="text-[11px] font-semibold text-amber-700">Alerta Media</span>
              </div>
              <span className="text-xl font-bold text-amber-800">{stats.semStats.yellow}</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-center">
              <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span className="text-[11px] font-semibold text-rose-700">Alto Riesgo</span>
              </div>
              <span className="text-xl font-bold text-rose-800">{stats.semStats.red}</span>
            </div>
          </div>
        </div>

        {/* ── LISTADO ── */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50">
          {/* Sin departamento */}
          {!selectedDept ? (
            <div className="text-center py-16 px-4">
              <div className={`w-16 h-16 rounded-2xl ${entityColors.bg} ${entityColors.text} border ${entityColors.border} flex items-center justify-center mx-auto mb-4`}>
                <EntityIcon className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                Selecciona un departamento para iniciar la auditoría
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Elige el territorio en el selector de arriba. Los contratos de{' '}
                <strong>{currentEntityDef.shortName}</strong> se cargarán automáticamente.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {departments.slice(0, 10).map((d) => (
                  <button
                    key={d.code}
                    type="button"
                    onClick={() => setSelectedDept(d.code)}
                    className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 font-medium transition-all shadow-sm"
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

          ) : contractorSearchActive && isContractorLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Consultando historial de «{searchedContractorQuery}» en SECOP II...
              </p>
              <p className="text-xs text-slate-400 mt-1">Rastreando todas las adjudicaciones en Datos Abiertos Colombia</p>
            </div>

          ) : contractorSearchActive && contractorError ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 max-w-md mx-auto my-8">
              <WarningIcon className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm">Error en la consulta del contratista</h4>
              <p className="text-xs mt-1">{contractorError}</p>
              <button
                type="button"
                onClick={handleClearContractorSearch}
                className="mt-4 btn-secondary text-xs py-1.5"
              >
                Volver a contratos de la entidad
              </button>
            </div>

          ) : contractorSearchActive && contractorContracts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <BuildingOfficeIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-700">
                Sin contratos para «{searchedContractorQuery}»
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No se encontraron contratos adjudicados en SECOP II con ese nombre o razón social.
              </p>
              <button
                type="button"
                onClick={handleClearContractorSearch}
                className="mt-4 btn-secondary text-xs py-1.5"
              >
                Volver a contratos de {currentEntityDef.shortName}
              </button>
            </div>

          ) : isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="text-sm font-medium text-slate-600">
                Consultando contratos de {currentEntityDef.name} en SECOP II...
              </p>
              <p className="text-xs text-slate-400 mt-1">Conectando con Datos Abiertos Colombia</p>
            </div>

          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-800 max-w-md mx-auto my-8">
              <WarningIcon className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm">Error en la consulta</h4>
              <p className="text-xs mt-1">{error}</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="btn-primary text-xs py-1.5 px-4"
                >
                  🔄 Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => { setError(null); setSelectedMun(''); }}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Ver todo el departamento
                </button>
              </div>
            </div>

          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed border-slate-300">
              <BuildingOfficeIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h4 className="text-base font-bold text-slate-700">
                Sin contratos registrados para {currentEntityDef.shortName}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                En {currentMunName ? `${currentMunName} (${currentDeptName})` : currentDeptName}, no se
                registran contratos en SECOP II bajo los criterios de esta entidad.
              </p>
              {selectedMun && (
                <button
                  type="button"
                  onClick={() => setSelectedMun('')}
                  className="mt-4 btn-secondary text-xs py-1.5"
                >
                  Ver todo el departamento ({currentDeptName})
                </button>
              )}
            </div>

          ) : (
            <div className="space-y-3">
              {/* Banner de búsqueda por contratista activa */}
              {contractorSearchActive && (
                <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BriefcaseIcon className="w-4 h-4 text-amber-400 shrink-0" />
                      <h3 className="text-sm font-bold">
                        Historial: <span className="text-amber-300">{searchedContractorQuery}</span>
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        SECOP II
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <strong className="text-slate-300">{contractorContracts.length} contratos</strong> adjudicados a este contratista en la base de datos nacional.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearContractorSearch}
                    className="self-start sm:self-center btn-ghost text-white/70 text-xs py-1 px-3 border border-white/10"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                    <span>Volver a la entidad</span>
                  </button>
                </div>
              )}

              {/* Banner de auditoría municipal */}
              {!contractorSearchActive && selectedMun && (
                <div className={`p-3 ${entityColors.bg} border ${entityColors.border} rounded-xl text-xs flex items-center gap-2.5 mb-2`}>
                  <LocationMarkerIcon className={`w-4 h-4 ${entityColors.text} shrink-0`} />
                  <div className={entityColors.text}>
                    <span className="font-bold">Auditoría Municipal Exclusiva:</span>{' '}
                    Mostrando únicamente contratos de <strong>{currentEntityDef.shortName}</strong> en{' '}
                    <strong>{currentMunName}</strong> ({currentDeptName}).
                  </div>
                </div>
              )}

              {/* Tarjetas de contratos */}
              {filteredContracts.map((c) => {
                const statusConfig =
                  c.status === 'Verde'
                    ? { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Bajo Riesgo' }
                    : c.status === 'Amarillo'
                      ? { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400', label: 'Alerta Media' }
                      : { pill: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Alto Riesgo' };

                return (
                  <div
                    key={c.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {c.id}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                          {statusConfig.label}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">{c.procurementMethod}</span>
                      </div>

                      <h4
                        className="font-semibold text-slate-800 text-sm line-clamp-2 cursor-pointer hover:text-blue-600 transition-colors"
                        title={c.name}
                        onClick={() => onViewDetailsClick(c)}
                        role="button"
                        tabIndex={0}
                      >
                        {c.name}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          <span className="font-semibold text-slate-700">Entidad:</span>{' '}
                          {c.entityName || 'Entidad Oficial'}
                        </span>
                        <span>
                          <span className="font-semibold text-slate-700">Contratista:</span>{' '}
                          {c.contractor}
                        </span>
                        {c.startDate && (
                          <span>
                            <span className="font-semibold text-slate-700">Firma:</span>{' '}
                            {formatDate(c.startDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                          Valor
                        </span>
                        <span className="text-base font-bold text-slate-900 font-mono">
                          {formatCurrency(c.value)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onAlertClick && (
                          <button
                            type="button"
                            onClick={() => onAlertClick(c)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition-colors"
                            title="Reportar anomalía ciudadana"
                          >
                            <FlagIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewDetailsClick(c)}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                          <span>Expediente</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
          <span>
            {filteredContracts.length} de {contracts.length} contratos auditados
            {currentDeptName && ` · ${currentMunName || currentDeptName}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              title="Limpiar caché y recargar contratos"
              className="text-[11px] text-slate-500 hover:text-blue-600 transition-colors px-2 py-1 rounded hover:bg-slate-100"
            >
              🗑️ Limpiar caché
            </button>
            <button
              onClick={onClose}
              className="btn-secondary text-xs py-1.5 px-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecentralizedEntitiesModal;
