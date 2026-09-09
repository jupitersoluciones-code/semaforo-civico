import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import ProjectCard from './components/ProjectCard';
import DashboardStats from './components/DashboardStats';
import DetectionPotential from './components/DetectionPotential';
import SearchBar from './components/SearchBar';
import ComparisonView from './components/ComparisonView';
import ExportButton from './components/ExportButton';
import SemaphoreChart from './components/SemaphoreChart';
import ModalityChart from './components/ModalityChart';
import ContractSplittingDetector from './components/ContractSplittingDetector';
import EntityProfile from './components/EntityProfile';
import CreateAlertModal from './components/CreateAlertModal';
import SecopContractsModal from './components/SecopContractsModal';
import ContractDetailsModal from './components/ContractDetailsModal';
import PriceComparisonModal from './components/PriceComparisonModal';
import AIConsultantModal from './components/AIConsultantModal';
import AlertsHistoryModal from './components/AlertsHistoryModal';
import MinorContractsModal from './components/MinorContractsModal';
import InteradministrativeContractsModal from './components/InteradministrativeContractsModal';
import HousingContractsModal from './components/HousingContractsModal';
import ContractorsSearchModal from './components/ContractorsSearchModal';
import ForensicAuditModal from './components/ForensicAuditModal';
import DecentralizedEntitiesModal from './components/DecentralizedEntitiesModal';
import {
  fetchDepartments,
  fetchMunicipalitiesByDepartment,
  fetchContractsByMunicipality,
  fetchContractsByDepartment,
  fetchContractsByDecentralizedEntity,
  mapRealContractToContract,
  resolveDepartmentCode,
} from './services/datosGovService';
import { FEATURED_DEPARTMENTS, DECENTRALIZED_ENTITIES } from './utils/constants';
import { useMunicipalityData } from './hooks/useMunicipalityData';
import { useModals } from './hooks/useModals';
import type {
  Department,
  Municipality,
  RealContract,
  MinorContract,
  InteradministrativeContract,
  HousingContract,
  DecentralizedEntityId,
} from './utils/types';
import { ChevronDownIcon, SearchIcon, BuildingOfficeIcon, BoltIcon, WarningIcon, ScaleIcon, UsersIcon, HomeIcon, AuditIcon } from './components/Icons';
import { ToastContainer, type ToastMessage } from './components/Toast';

const App: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);

  const [secopContracts, setSecopContracts] = useState<RealContract[]>([]);
  const [isLoadingSecop, setIsLoadingSecop] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const {
    contracts,
    realContracts,
    stats,
    splitting,
    semaphoreStats,
    isLoading,
    error,
    loadLocationData,
    loadMunicipalityData,
    reset,
  } = useMunicipalityData();
  const modals = useModals();

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setToasts((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Carga inicial de departamentos y sincronización de URL (Deep Linking)
  useEffect(() => {
    fetchDepartments().then(async (depts) => {
      setDepartments(depts);
      const urlMun = searchParams.get('municipio');
      const urlDept = searchParams.get('departamento');
      const urlEntity = searchParams.get('entidad') || 'all';
      if (urlEntity) setSelectedEntity(urlEntity);

      if (urlMun && urlMun.length >= 5) {
        const deptCode = urlMun.substring(0, 2);
        setSelectedDepartment(deptCode);
        const muns = await fetchMunicipalitiesByDepartment(deptCode);
        setMunicipalities(muns);
        setSelectedMunicipality(urlMun);
        loadLocationData(deptCode, urlMun, urlEntity);
      } else if (urlDept) {
        const resolved = resolveDepartmentCode(urlDept) || urlDept;
        setSelectedDepartment(resolved);
        const muns = await fetchMunicipalitiesByDepartment(resolved);
        setMunicipalities(muns);
        loadLocationData(resolved, undefined, urlEntity);
      }
    });
  }, [searchParams, loadLocationData]);

  const handleDepartmentChange = useCallback(
    async (code: string) => {
      setSelectedDepartment(code);
      setSelectedMunicipality('');
      setMunicipalities([]);
      setExpandedCategories(new Set());
      const nextParams: Record<string, string> = {};
      if (code) nextParams.departamento = code;
      if (selectedEntity && selectedEntity !== 'all') nextParams.entidad = selectedEntity;
      setSearchParams(nextParams);

      if (code) {
        setIsLoadingMunicipalities(true);
        loadLocationData(code, undefined, selectedEntity);
        const muns = await fetchMunicipalitiesByDepartment(code);
        setMunicipalities(muns);
        setIsLoadingMunicipalities(false);
      } else {
        reset();
      }
    },
    [loadLocationData, reset, selectedEntity, setSearchParams],
  );

  const handleMunicipalityChange = useCallback(
    async (code: string) => {
      setSelectedMunicipality(code);
      setExpandedCategories(new Set());
      const nextParams: Record<string, string> = {};
      if (code) nextParams.municipio = code;
      else if (selectedDepartment) nextParams.departamento = selectedDepartment;
      if (selectedEntity && selectedEntity !== 'all') nextParams.entidad = selectedEntity;
      setSearchParams(nextParams);

      if (code) {
        loadLocationData(selectedDepartment, code, selectedEntity);
      } else if (selectedDepartment) {
        loadLocationData(selectedDepartment, undefined, selectedEntity);
      } else {
        reset();
      }
    },
    [loadLocationData, reset, selectedDepartment, selectedEntity, setSearchParams],
  );

  const handleEntityChange = useCallback(
    (entityId: string) => {
      setSelectedEntity(entityId);
      setExpandedCategories(new Set());
      const nextParams: Record<string, string> = {};
      if (selectedMunicipality) nextParams.municipio = selectedMunicipality;
      else if (selectedDepartment) nextParams.departamento = selectedDepartment;
      if (entityId && entityId !== 'all') nextParams.entidad = entityId;
      setSearchParams(nextParams);

      if (selectedDepartment || selectedMunicipality) {
        loadLocationData(selectedDepartment, selectedMunicipality, entityId);
      }
    },
    [loadLocationData, selectedDepartment, selectedMunicipality, setSearchParams],
  );

  const handleConsultarSecop = useCallback(async () => {
    if (!selectedDepartment && !selectedMunicipality) return;
    setIsLoadingSecop(true);
    modals.openSecop();

    if (realContracts.length > 0) {
      setSecopContracts(realContracts);
    }

    try {
      let loaded: RealContract[] = [];
      if (selectedEntity && selectedEntity !== 'all') {
        loaded = await fetchContractsByDecentralizedEntity(
          selectedEntity as DecentralizedEntityId,
          selectedDepartment,
          selectedMunicipality,
          100,
        );
      } else if (selectedMunicipality) {
        loaded = await fetchContractsByMunicipality(selectedMunicipality, 100);
      } else {
        loaded = await fetchContractsByDepartment(selectedDepartment, 100);
      }
      if (loaded && loaded.length > 0) {
        setSecopContracts(loaded);
      }
    } finally {
      setIsLoadingSecop(false);
    }
  }, [selectedDepartment, selectedMunicipality, selectedEntity, realContracts, modals]);

  const handleConsultar = useCallback(() => {
    if (!selectedDepartment && !selectedMunicipality) return;
    loadLocationData(selectedDepartment, selectedMunicipality, selectedEntity);
    setTimeout(() => {
      const section = document.getElementById('contracts-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  }, [selectedDepartment, selectedMunicipality, selectedEntity, loadLocationData]);

  // Al cargar contratos, expandir automáticamente las categorías para visualización inmediata
  useEffect(() => {
    if (contracts.length > 0) {
      const allCategories = new Set(contracts.map((c) => c.category || 'General'));
      setExpandedCategories(allCategories);
    }
  }, [contracts]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) newSet.delete(category);
      else newSet.add(category);
      return newSet;
    });
  };

  const groupedContracts = contracts.reduce<Record<string, typeof contracts>>((acc, contract) => {
    const category = contract.category || 'Sin Categoria';
    if (!acc[category]) acc[category] = [];
    acc[category].push(contract);
    return acc;
  }, {});

  const selectedDepartmentName =
    departments.find((d) => d.code === selectedDepartment)?.name || '';
  const selectedMunicipalityName =
    municipalities.find((m) => m.code === selectedMunicipality)?.name || '';
  const selectedEntityDef = DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity);
  const baseLocation = selectedMunicipalityName
    ? `${selectedMunicipalityName} (${selectedDepartmentName || 'Municipio'})`
    : selectedDepartmentName
      ? `${selectedDepartmentName} (Nivel Departamental)`
      : '';
  const currentLocationLabel = baseLocation && selectedEntityDef
    ? `${baseLocation} • ${selectedEntityDef.icon} ${selectedEntityDef.shortName}`
    : baseLocation;

  // Mapeo verídico para consultas de vigilancia especializadas
  const minorContracts: MinorContract[] = useMemo(() => {
    return realContracts
      .filter((c) => {
        const mod = (c.modalidad_de_contratacion || '').toLowerCase();
        return mod.includes('mínima') || mod.includes('minima');
      })
      .map((c) => ({
        id: c.id_contrato || c.referencia_del_contrato || 'N/A',
        municipalityCode: selectedMunicipality || selectedDepartment,
        contractorName: c.proveedor_adjudicado || 'No adjudicado',
        contractorNit: c.nit_entidad || 'N/A',
        contractorAddress: c.ciudad || '',
        contractorPhone: '',
        value: Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0,
        object: c.objeto_del_contrato || c.descripcion_del_proceso || 'Sin descripción',
      }));
  }, [realContracts, selectedMunicipality, selectedDepartment]);

  const interContracts: InteradministrativeContract[] = useMemo(() => {
    return realContracts
      .filter((c) => {
        const text = (
          (c.modalidad_de_contratacion || '') +
          ' ' +
          (c.tipo_de_contrato || '') +
          ' ' +
          (c.objeto_del_contrato || '')
        ).toLowerCase();
        return (
          text.includes('interadministrativo') ||
          text.includes('convenio') ||
          text.includes('asociación')
        );
      })
      .map((c) => ({
        id: c.id_contrato || c.referencia_del_contrato || 'N/A',
        municipalityCode: selectedMunicipality || selectedDepartment,
        contractorName: c.proveedor_adjudicado || 'No adjudicado',
        contractorNit: c.nit_entidad || 'N/A',
        contractorAddress: c.ciudad || '',
        contractorPhone: '',
        value: Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0,
        object: c.objeto_del_contrato || c.descripcion_del_proceso || 'Convenio interadministrativo',
        startDate: c.fecha_inicio_ejecucion || c.fecha_de_firma || '',
        endDate: c.fecha_fin_ejecucion || '',
      }));
  }, [realContracts, selectedMunicipality, selectedDepartment]);

  const housingContracts: HousingContract[] = useMemo(() => {
    return realContracts
      .filter((c) => {
        const text = (
          (c.objeto_del_contrato || '') +
          ' ' +
          (c.descripcion_del_proceso || '') +
          ' ' +
          (c.sector || '')
        ).toLowerCase();
        return (
          text.includes('vivienda') ||
          text.includes('habitacional') ||
          text.includes('subsidio') ||
          text.includes('reubicación')
        );
      })
      .map((c) => ({
        id: c.id_contrato || c.referencia_del_contrato || 'N/A',
        municipalityCode: selectedMunicipality || selectedDepartment,
        object: c.objeto_del_contrato || c.descripcion_del_proceso || 'Proyecto habitacional',
        value: Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0,
        contractorName: c.proveedor_adjudicado || 'No adjudicado',
        contractorNit: c.nit_entidad || 'N/A',
        beneficiaries: 1,
        subsidyType: 'Mejoramiento',
        address: c.ciudad || '',
      }));
  }, [realContracts, selectedMunicipality, selectedDepartment]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header onOpenContractorsSearch={modals.openContractorsSearch} />
      <main className="container mx-auto p-4 md:p-6">
        <div className="space-y-6">
          <FilterControls
            departments={departments}
            municipalities={municipalities}
            selectedDepartment={selectedDepartment}
            selectedMunicipality={selectedMunicipality}
            selectedEntity={selectedEntity}
            onDepartmentChange={handleDepartmentChange}
            onMunicipalityChange={handleMunicipalityChange}
            onEntityChange={handleEntityChange}
            onOpenDecentralizedModal={modals.openDecentralized}
            isLoadingMunicipalities={isLoadingMunicipalities}
            onConsultar={handleConsultar}
            isLoadingContracts={isLoading}
          />

          {(selectedDepartment || selectedMunicipality) && (
            <div className="space-y-4">
              {/* Barra de Acciones Principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 h-full">
                    <div>
                      <h2 className="font-bold text-slate-800">Control Social a SECOP</h2>
                      <p className="text-sm text-slate-600 mt-1">Consulta los procesos públicos.</p>
                    </div>
                    <button onClick={handleConsultarSecop} className="btn-primary whitespace-nowrap">
                      {isLoadingSecop ? 'Consultando...' : 'Consultar SECOP'}
                    </button>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 h-full">
                    <div>
                      <h2 className="font-bold text-slate-800">Comparar Municipios</h2>
                      <p className="text-sm text-slate-600 mt-1">Benchmarking territorial.</p>
                    </div>
                    <button
                      onClick={() => modals.openComparison()}
                      className="btn-secondary whitespace-nowrap"
                    >
                      Comparar
                    </button>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 h-full">
                    <div>
                      <h2 className="font-bold text-slate-800">Búsqueda Global</h2>
                      <p className="text-sm text-slate-600 mt-1">Buscar en todos los contratos.</p>
                    </div>
                    <button
                      onClick={modals.openSearch}
                      className="bg-purple-600 text-white font-semibold py-2 px-5 rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      <SearchIcon className="w-5 h-5" />
                      Buscar
                    </button>
                  </div>
                </div>

                <div className="stat-card flex items-center justify-between gap-3">
                  <ExportButton
                    contracts={realContracts}
                    municipalityName={currentLocationLabel || 'Contratos'}
                  />
                  <button
                    onClick={modals.openAlerts}
                    className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md px-3 py-2 transition-colors flex items-center gap-1.5"
                  >
                    <WarningIcon className="w-4 h-4 text-amber-600" />
                    Mis Alertas
                  </button>
                </div>
              </div>

              {/* Sub-barra de Consultas Especializadas Rescatadas */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Vigilancia Especializada de Contratación
                    </h3>
                    <p className="text-xs text-slate-500">
                      Módulos focalizados en áreas de alto riesgo contractual.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={modals.openMinor}
                      className="btn-module"
                    >
                      <ScaleIcon className="w-3.5 h-3.5" />
                      Cuantías Mínimas ({minorContracts.length})
                    </button>
                    <button
                      onClick={modals.openInter}
                      className="btn-module"
                    >
                      <UsersIcon className="w-3.5 h-3.5" />
                      Interadministrativos ({interContracts.length})
                    </button>
                    <button
                      onClick={modals.openHousing}
                      className="btn-module"
                    >
                      <HomeIcon className="w-3.5 h-3.5" />
                      Vivienda &amp; Subsidios ({housingContracts.length})
                    </button>
                    <button
                      onClick={modals.openDecentralized}
                      className="btn-module-accent"
                    >
                      <BuildingOfficeIcon className="w-3.5 h-3.5" />
                      Entidades Descentralizadas
                    </button>
                    <button
                      onClick={modals.openContractorsSearch}
                      className="btn-module-accent"
                    >
                      <AuditIcon className="w-3.5 h-3.5" />
                      Auditar Contratantes y Licitantes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <WarningIcon className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm text-rose-900">Inconveniente al consultar datos oficiales</h3>
                  <p className="text-xs text-rose-700 mt-0.5">
                    {error.includes('timeout') || error.includes('fetch') || error.includes('50')
                      ? 'La plataforma de Datos Abiertos Colombia (SECOP II) presenta intermitencias momentáneas.'
                      : error}
                  </p>
                </div>
              </div>
              {(selectedDepartment || selectedMunicipality) && (
                <button
                  onClick={() => loadLocationData(selectedDepartment, selectedMunicipality)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shadow-sm self-start sm:self-auto"
                >
                  Reintentar consulta
                </button>
              )}
            </div>
          )}

          {(selectedDepartment || selectedMunicipality || isLoading) && (
            <DashboardStats stats={stats} isLoading={isLoading} />
          )}

          {realContracts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SemaphoreChart
                green={semaphoreStats.green}
                yellow={semaphoreStats.yellow}
                red={semaphoreStats.red}
                total={semaphoreStats.total}
              />
              <ModalityChart contracts={realContracts} />
            </div>
          )}

          {splitting.length > 0 && <ContractSplittingDetector splitting={splitting} />}

          <DetectionPotential />

          {(selectedDepartment || selectedMunicipality) && isLoading && (
            <div id="contracts-section" className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Consultando contratos oficiales en SECOP II...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Extrayendo contratistas, valores y dictamen de semáforo para {currentLocationLabel || 'la ubicación'}
              </p>
            </div>
          )}

          {(selectedDepartment || selectedMunicipality) && !isLoading && (
            <div id="contracts-section" className="space-y-6 scroll-mt-6">
              {contracts.length > 0 && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800">
                          {selectedEntityDef
                            ? `Contratos Oficiales: ${selectedEntityDef.name}`
                            : 'Contratos por Categoría'}
                        </h2>
                        {selectedEntityDef && (
                          <span className="badge-blue">
                            {selectedEntityDef.shortName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {contracts.length} contratos auditados con Semáforo Cívico en {currentLocationLabel ? `(${currentLocationLabel})` : ''}
                      </p>
                    </div>

                    {selectedEntityDef && (
                      <button
                        onClick={modals.openDecentralized}
                        className="btn-module-accent self-start sm:self-auto"
                      >
                        <BuildingOfficeIcon className="w-3.5 h-3.5" />
                        <span>Auditoría Especializada {selectedEntityDef.shortName}</span>
                      </button>
                    )}
                  </div>

                  {selectedEntityDef && selectedMunicipalityName && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2 mb-4">
                      <BuildingOfficeIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold">Cobertura Territorial y Regional:</span> Auditando contratos oficiales de la entidad{' '}
                        <strong>{selectedEntityDef.name}</strong> con impacto y cobertura en{' '}
                        <strong>{selectedMunicipalityName}</strong> ({selectedDepartmentName}).
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {Object.keys(groupedContracts)
                      .sort()
                      .map((category) => {
                        const categoryContracts = groupedContracts[category];
                        const isExpanded = expandedCategories.has(category);
                        return (
                          <div key={category} className="card">
                            <button
                              onClick={() => toggleCategory(category)}
                              className="w-full flex justify-between items-center p-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
                              aria-expanded={isExpanded}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-800">{category}</span>
                                <span className="text-sm bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                                  {categoryContracts.length}
                                </span>
                              </div>
                              <ChevronDownIcon
                                className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            {isExpanded && (
                              <div className="p-4 border-t border-slate-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {categoryContracts.map((c) => (
                                    <ProjectCard
                                      key={c.id}
                                      project={c}
                                      onAlertClick={modals.openAlert}
                                      onViewDetailsClick={modals.openDetails}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {contracts.length === 0 && realContracts.length === 0 && (
                <div className="text-center py-16 px-4 bg-white rounded-lg border border-dashed">
                  <BuildingOfficeIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-700">No se encontraron contratos</h3>
                  <p className="text-slate-500 mt-1">
                    Intenta con otro municipio o verifica la conexión.
                  </p>
                </div>
              )}
            </div>
          )}

          {!selectedDepartment && !selectedMunicipality && !isLoading && (
            <div className="py-10 px-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="text-center max-w-xl mx-auto mb-8">
                <BuildingOfficeIcon className="w-12 h-12 mx-auto text-blue-600 mb-3" />
                <h3 className="text-xl font-bold text-slate-800">Selecciona un departamento para consultar</h3>
                <p className="text-slate-600 text-sm mt-1.5">
                  Elige un departamento del menú superior o pulsa cualquiera de los departamentos recomendados a continuación para auditar sus contratos de SECOP II en tiempo real:
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
                {FEATURED_DEPARTMENTS.map((dept) => (
                  <button
                    key={dept.code}
                    onClick={() => handleDepartmentChange(dept.code)}
                    className="p-3.5 text-left rounded-xl border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/40 hover:shadow-md transition-all duration-150 group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm group-hover:bg-blue-100 transition-colors">
                        {dept.name.charAt(0)}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-blue-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                        {dept.region}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                        {dept.name}
                      </h4>
                      <p className="text-xs text-slate-500">Cap: {dept.capital}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-medium">
                      <span>Auditar</span>
                      <span>&rarr;</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200 mt-8">
        <p>
          Fuente de datos:{' '}
          <a
            href="https://www.datos.gov.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Datos Abiertos Colombia (SECOP II)
          </a>{' '}
          - Datos bajo licencia CC BY-SA 4.0
        </p>
        <div className="mt-2.5 flex items-center justify-center gap-3 text-xs flex-wrap">
          <a
            href="/Brochure_Semaforo_Civico.pdf"
            download="Brochure_Semaforo_Civico.pdf"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold bg-blue-50/80 hover:bg-blue-100 px-3 py-1 rounded-full border border-blue-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar Portafolio Comercial (PDF)
          </a>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-400">
            Jupiter Soluciones &mdash; CEO Pedro Antonio Hoyos
          </span>
        </div>
      </footer>

      {/* MODALES DEL SISTEMA */}
      {modals.alertProject && (
        <CreateAlertModal
          project={modals.alertProject}
          onClose={modals.closeAlert}
          onSuccess={() => {
            modals.closeAlert();
            addToast('success', '¡Alerta ciudadana registrada y persistida exitosamente!');
          }}
        />
      )}

      {modals.secopOpen && (
        <SecopContractsModal
          isOpen={modals.secopOpen}
          contracts={secopContracts}
          municipalityName={currentLocationLabel || 'Ubicación seleccionada'}
          onClose={modals.closeSecop}
          isLoading={isLoadingSecop}
        />
      )}

      <AlertsHistoryModal isOpen={modals.alertsOpen} onClose={modals.closeAlerts} />

      <SearchBar
        isOpen={modals.searchOpen}
        onClose={modals.closeSearch}
        onSelectContract={(rc) => {
          const contract = mapRealContractToContract(rc);
          modals.closeSearch();
          modals.openDetails(contract);
        }}
      />

      <ComparisonView
        isOpen={modals.comparisonOpen}
        onClose={modals.closeComparison}
        municipalities={municipalities}
      />

      <EntityProfile
        isOpen={modals.entityOpen}
        onClose={modals.closeEntity}
        entityName={modals.entityName}
        currentMunicipalityCode={selectedMunicipality || selectedDepartment}
      />

      {/* Modales Especializados Rescatados e Integrados */}
      {modals.minorOpen && (
        <MinorContractsModal
          contracts={minorContracts}
          municipalityName={currentLocationLabel || 'Ubicación seleccionada'}
          onClose={modals.closeMinor}
          isLoading={isLoading}
        />
      )}

      {modals.interOpen && (
        <InteradministrativeContractsModal
          contracts={interContracts}
          municipalityName={currentLocationLabel || 'Ubicación seleccionada'}
          onClose={modals.closeInter}
          isLoading={isLoading}
        />
      )}

      {modals.housingOpen && (
        <HousingContractsModal
          contracts={housingContracts}
          municipalityName={currentLocationLabel || 'Ubicación seleccionada'}
          onClose={modals.closeHousing}
          isLoading={isLoading}
        />
      )}

      {/* Modal de Búsqueda Nacional de Entidades Compradoras y Empresas Licitantes */}
      <ContractorsSearchModal
        isOpen={modals.contractorsSearchOpen}
        onClose={modals.closeContractorsSearch}
        onSelectContract={(c) => modals.openDetails(c)}
        onForensicAudit={(c) => modals.openForensicAudit(c)}
      />

      {/* Modal de Auditoría Especializada a Entidades Descentralizadas */}
      <DecentralizedEntitiesModal
        isOpen={modals.decentralizedOpen}
        onClose={modals.closeDecentralized}
        departments={departments}
        municipalities={municipalities}
        initialDepartment={selectedDepartment}
        initialMunicipality={selectedMunicipality}
        initialEntityId={selectedEntity as DecentralizedEntityId}
        onViewDetailsClick={(c) => modals.openDetails(c)}
        onAlertClick={(c) => modals.openAlert(c)}
      />

      {/* MODALES DETALLE DE MAYOR JERARQUÍA (SIEMPRE SOBRE LOS DEMÁS) */}
      {modals.detailsContract && (
        <ContractDetailsModal
          contract={modals.detailsContract}
          onClose={modals.closeDetails}
          onAlertClick={(c) => {
            modals.closeDetails();
            modals.openAlert(c);
          }}
          onComparePricesClick={modals.openPriceComparison}
          onAIClick={(c) => {
            modals.closeDetails();
            modals.openAI(c);
          }}
          onForensicAuditClick={(c) => {
            modals.openForensicAudit(c);
          }}
        />
      )}

      {/* Modal de Dictamen Pericial Forense FAEPP */}
      <ForensicAuditModal
        isOpen={modals.forensicAuditOpen}
        onClose={modals.closeForensicAudit}
        contract={modals.forensicAuditContract}
      />

      {modals.priceContract && (
        <PriceComparisonModal
          contract={modals.priceContract}
          onClose={modals.closePriceComparison}
          onAlertClick={(c) => {
            modals.closePriceComparison();
            modals.openAlert(c);
          }}
        />
      )}

      <AIConsultantModal
        isOpen={Boolean(modals.aiContract)}
        onClose={modals.closeAI}
        contract={modals.aiContract}
      />

      {/* Contenedor flotante de notificaciones Toast */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
