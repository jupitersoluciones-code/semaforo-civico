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
import {
  fetchDepartments,
  fetchMunicipalitiesByDepartment,
  fetchContractsByMunicipality,
  fetchContractsByDepartment,
  mapRealContractToContract,
} from './services/datosGovService';
import { useMunicipalityData } from './hooks/useMunicipalityData';
import { useModals } from './hooks/useModals';
import type {
  Department,
  Municipality,
  RealContract,
  MinorContract,
  InteradministrativeContract,
  HousingContract,
} from './utils/types';
import { ChevronDownIcon, SearchIcon, BuildingOfficeIcon, BoltIcon, WarningIcon } from './components/Icons';
import { ToastContainer, type ToastMessage } from './components/Toast';

const App: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
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

      if (urlMun && urlMun.length >= 5) {
        const deptCode = urlMun.substring(0, 2);
        setSelectedDepartment(deptCode);
        const muns = await fetchMunicipalitiesByDepartment(deptCode);
        setMunicipalities(muns);
        setSelectedMunicipality(urlMun);
        loadLocationData(deptCode, urlMun);
      } else if (urlDept) {
        setSelectedDepartment(urlDept);
        const muns = await fetchMunicipalitiesByDepartment(urlDept);
        setMunicipalities(muns);
        loadLocationData(urlDept);
      }
    });
  }, [searchParams, loadLocationData]);

  const handleDepartmentChange = useCallback(
    async (code: string) => {
      setSelectedDepartment(code);
      setSelectedMunicipality('');
      setMunicipalities([]);
      setExpandedCategories(new Set());
      setSearchParams(code ? { departamento: code } : {});

      if (code) {
        setIsLoadingMunicipalities(true);
        loadLocationData(code);
        const muns = await fetchMunicipalitiesByDepartment(code);
        setMunicipalities(muns);
        setIsLoadingMunicipalities(false);
      } else {
        reset();
      }
    },
    [loadLocationData, reset, setSearchParams],
  );

  const handleMunicipalityChange = useCallback(
    async (code: string) => {
      setSelectedMunicipality(code);
      setExpandedCategories(new Set());
      if (code) {
        setSearchParams({ municipio: code });
        loadLocationData(selectedDepartment, code);
      } else if (selectedDepartment) {
        setSearchParams({ departamento: selectedDepartment });
        loadLocationData(selectedDepartment);
      } else {
        reset();
      }
    },
    [loadLocationData, reset, selectedDepartment, setSearchParams],
  );

  const handleConsultarSecop = useCallback(async () => {
    if (!selectedDepartment && !selectedMunicipality) return;
    setIsLoadingSecop(true);
    modals.openSecop();

    if (realContracts.length > 0) {
      setSecopContracts(realContracts);
    }

    try {
      const loaded = selectedMunicipality
        ? await fetchContractsByMunicipality(selectedMunicipality, 100)
        : await fetchContractsByDepartment(selectedDepartment, 100);
      if (loaded && loaded.length > 0) {
        setSecopContracts(loaded);
      }
    } finally {
      setIsLoadingSecop(false);
    }
  }, [selectedDepartment, selectedMunicipality, realContracts, modals]);

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
  const currentLocationLabel = selectedMunicipalityName
    ? `${selectedMunicipalityName} (${selectedDepartmentName || 'Municipio'})`
    : selectedDepartmentName
      ? `${selectedDepartmentName} (Nivel Departamental)`
      : '';

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
      <Header />
      <main className="container mx-auto p-4 md:p-6">
        <div className="space-y-6">
          <FilterControls
            departments={departments}
            municipalities={municipalities}
            selectedDepartment={selectedDepartment}
            selectedMunicipality={selectedMunicipality}
            onDepartmentChange={handleDepartmentChange}
            onMunicipalityChange={handleMunicipalityChange}
            isLoadingMunicipalities={isLoadingMunicipalities}
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
                      className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>⚖️</span>
                      Cuantías Mínimas ({minorContracts.length})
                    </button>
                    <button
                      onClick={modals.openInter}
                      className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>🤝</span>
                      Interadministrativos ({interContracts.length})
                    </button>
                    <button
                      onClick={modals.openHousing}
                      className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>🏠</span>
                      Vivienda & Subsidios ({housingContracts.length})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">⚠️</span>
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

          {(selectedDepartment || selectedMunicipality) && !isLoading && (
            <div className="space-y-6">
              {contracts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Contratos por Categoría</h2>
                      <p className="text-sm text-slate-600 -mt-1">
                        {contracts.length} contratos analizados con reglas de semáforo {currentLocationLabel ? `(${currentLocationLabel})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
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
            <div className="text-center py-16 px-4 bg-white rounded-lg border border-dashed">
              <BuildingOfficeIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-700">Selecciona un departamento o municipio</h3>
              <p className="text-slate-500 mt-1">
                Elige un departamento de la lista para auditar sus contratos públicos en tiempo real.
              </p>
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
      </footer>

      {/* Modales de Control Social */}
      {modals.alertProject && (
        <CreateAlertModal
          project={modals.alertProject}
          onClose={modals.closeAlert}
          onSuccess={() => addToast('success', '¡Alerta ciudadana registrada y persistida exitosamente!')}
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
        />
      )}

      <AIConsultantModal
        isOpen={Boolean(modals.aiContract)}
        onClose={modals.closeAI}
        contract={modals.aiContract}
      />

      <AlertsHistoryModal isOpen={modals.alertsOpen} onClose={modals.closeAlerts} />

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

      {/* Contenedor flotante de notificaciones Toast */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
