import React from 'react';
import type { Department, Municipality } from '../utils/types';
import { FEATURED_DEPARTMENTS, DECENTRALIZED_ENTITIES } from '../utils/constants';
import { LocationMarkerIcon, SearchIcon } from './Icons';

interface Props {
  departments: Department[];
  municipalities: Municipality[];
  selectedDepartment: string;
  selectedMunicipality: string;
  selectedEntity?: string;
  onDepartmentChange: (code: string) => void;
  onMunicipalityChange: (code: string) => void;
  onEntityChange?: (entityId: string) => void;
  onOpenDecentralizedModal?: () => void;
  isLoadingMunicipalities: boolean;
  onConsultar?: () => void;
  isLoadingContracts?: boolean;
}

const FilterControls: React.FC<Props> = ({
  departments,
  municipalities,
  selectedDepartment,
  selectedMunicipality,
  selectedEntity = 'all',
  onDepartmentChange,
  onMunicipalityChange,
  onEntityChange,
  onOpenDecentralizedModal,
  isLoadingMunicipalities,
  onConsultar,
  isLoadingContracts = false,
}) => {
  const currentDeptName = departments.find((d) => d.code === selectedDepartment)?.name || '';
  const currentMunName = municipalities.find((m) => m.code === selectedMunicipality)?.name || '';
  const currentEntityDef = DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity);

  // Obtener los códigos de departamentos destacados para el optgroup
  const featuredCodes = new Set(FEATURED_DEPARTMENTS.map((d) => d.code));
  const otherDepts = departments.filter((d) => !featuredCodes.has(d.code));

  return (
    <div className="card p-5 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LocationMarkerIcon className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-slate-700 text-sm">Selecciona una ubicación y entidad a auditar</h2>
        </div>
        {selectedEntity !== 'all' && currentEntityDef && (
          <span className="badge-indigo">
            {currentEntityDef.shortName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Selector de departamento */}
        <div>
          <label htmlFor="department-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Departamento
          </label>
          <select
            id="department-select"
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="form-select"
          >
            <option value="">— Seleccionar departamento —</option>
            <optgroup label="Búsqueda rápida">
              {FEATURED_DEPARTMENTS.map((d) => (
                <option key={`featured-${d.code}`} value={d.code}>
                  {d.name} — {d.capital}
                </option>
              ))}
            </optgroup>
            <optgroup label="Todos los departamentos">
              {otherDepts.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Selector de municipio */}
        <div>
          <label htmlFor="municipality-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Municipio
          </label>
          <select
            id="municipality-select"
            value={selectedMunicipality}
            onChange={(e) => onMunicipalityChange(e.target.value)}
            disabled={!selectedDepartment || isLoadingMunicipalities}
            className="form-select"
          >
            <option value="">
              {isLoadingMunicipalities
                ? 'Cargando municipios...'
                : selectedDepartment
                  ? `Todo el departamento (${municipalities.length} municipios)`
                  : '— Selecciona un departamento primero —'}
            </option>
            {municipalities.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
          {selectedDepartment && (
            <p className="text-xs text-slate-400 mt-1">
              {selectedMunicipality
                ? 'Filtrado por municipio específico.'
                : `Auditoría nivel departamental (${municipalities.length} municipios).`}
            </p>
          )}
        </div>

        {/* Selector de entidad */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="entity-select" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Entidad Pública
            </label>
            {selectedEntity !== 'all' && onEntityChange && (
              <button
                type="button"
                onClick={() => onEntityChange('all')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
              >
                Ver todas
              </button>
            )}
          </div>
          <select
            id="entity-select"
            value={selectedEntity}
            onChange={(e) => onEntityChange?.(e.target.value)}
            className="form-select font-medium"
          >
            <option value="all">Todas las entidades (Alcaldías, Gob., Descentralizadas)</option>
            {DECENTRALIZED_ENTITIES.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1 truncate" title={currentEntityDef?.name}>
            {selectedEntity !== 'all' && currentEntityDef
              ? `Auditoría enfocada en ${currentEntityDef.shortName}.`
              : 'Alcaldías, gobernaciones y entidades descentralizadas.'}
          </p>
        </div>
      </div>

      {/* Barra de acción */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          {currentDeptName ? (
            <span>
              Auditoría lista para:{' '}
              <strong className="text-slate-800 font-semibold">{currentDeptName}</strong>
              {currentMunName && (
                <span>
                  {' '}
                  &rsaquo; <strong className="text-slate-800 font-semibold">{currentMunName}</strong>
                </span>
              )}
              {currentEntityDef && (
                <span>
                  {' '}
                  &bull; <strong className="text-indigo-700">{currentEntityDef.shortName}</strong>
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">Selecciona un departamento o municipio para iniciar</span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onOpenDecentralizedModal && (
            <button
              type="button"
              onClick={onOpenDecentralizedModal}
              className="btn-secondary text-xs py-2 px-4 whitespace-nowrap"
            >
              Auditoría Especializada
            </button>
          )}
          <button
            type="button"
            id="btn-consultar-contratos"
            onClick={onConsultar}
            disabled={(!selectedDepartment && !selectedMunicipality) || isLoadingContracts}
            className="btn-primary whitespace-nowrap flex-1 sm:flex-none"
          >
            {isLoadingContracts ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Consultando SECOP II...</span>
              </>
            ) : (
              <>
                <SearchIcon className="w-4 h-4" />
                <span>Consultar Contratos</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterControls);


