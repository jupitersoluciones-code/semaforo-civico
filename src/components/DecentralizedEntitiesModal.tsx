import React, { useState, useMemo, useEffect } from 'react';
import type { RealContract, Contract, Department, Municipality, DecentralizedEntityId } from '../utils/types';
import { DECENTRALIZED_ENTITIES } from '../utils/constants';
import { fetchContractsByDecentralizedEntity } from '../services/datosGovService';
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

  const currentEntityDef = useMemo(
    () => DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity) || DECENTRALIZED_ENTITIES[0],
    [selectedEntity],
  );

  const analyzedContracts = useMemo(() => {
    return analyzeRealContracts(contracts);
  }, [contracts]);

  const stats = useMemo(() => {
    const totalValue = contracts.reduce((acc, c) => {
      const val = Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0;
      return acc + val;
    }, 0);
    const semStats = getSemaphoreStats(analyzedContracts);
    return {
      total: contracts.length,
      totalValue,
      semStats,
    };
  }, [contracts, analyzedContracts]);

  const filteredContracts = useMemo(() => {
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
  }, [analyzedContracts, searchTerm]);

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
                onClick={() => setSelectedEntity(ent.id)}
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

        {/* Barra de filtros de ubicación contextual */}
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
              onChange={(e) => setSelectedMun(e.target.value)}
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

          <div className="relative min-w-[240px] max-w-xs flex-1">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por contratista, objeto o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
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
          {isLoading ? (
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
                En {currentMunName ? `${currentMunName} (${currentDeptName})` : currentDeptName}, no se registran contratos en SECOP II bajo los criterios de búsqueda de esta entidad.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedMun && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2.5 mb-3">
                  <span className="text-lg shrink-0">🏛️</span>
                  <div>
                    <span className="font-bold">Cobertura Territorial y Regional:</span>{' '}
                    Auditando contratos oficiales de <strong>{currentEntityDef.name}</strong> con operación, impacto y cobertura en{' '}
                    <strong>{currentMunName}</strong> ({currentDeptName}).
                  </div>
                </div>
              )}
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

                      <h4 className="font-semibold text-slate-800 text-sm line-clamp-2" title={c.name}>
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
                            onClick={() => onAlertClick(c)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                            title="Reportar anomalía ciudadana"
                          >
                            🚨 Alerta
                          </button>
                        )}
                        <button
                          onClick={() => onViewDetailsClick(c)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
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
