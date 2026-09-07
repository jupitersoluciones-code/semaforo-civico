import React from 'react';
import type { Department, Municipality } from '../utils/types';
import { FEATURED_DEPARTMENTS, DECENTRALIZED_ENTITIES } from '../utils/constants';
import { LocationMarkerIcon } from './Icons';

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

  return (
    <div className="card p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LocationMarkerIcon className="w-5 h-5 text-blue-600" />
          <h2 className="font-semibold text-slate-700">Selecciona una ubicación y entidad a auditar</h2>
        </div>
        {selectedEntity !== 'all' && currentEntityDef && (
          <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-medium border border-indigo-200">
            {currentEntityDef.icon} {currentEntityDef.shortName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="department-select" className="block text-sm font-medium text-slate-600 mb-1">
            Departamento
          </label>
          <select
            id="department-select"
            value={selectedDepartment}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">-- Selecciona un departamento --</option>
            {departments.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="municipality-select" className="block text-sm font-medium text-slate-600 mb-1">
            Municipio
          </label>
          <select
            id="municipality-select"
            value={selectedMunicipality}
            onChange={(e) => onMunicipalityChange(e.target.value)}
            disabled={!selectedDepartment || isLoadingMunicipalities}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {isLoadingMunicipalities
                ? 'Cargando municipios...'
                : selectedDepartment
                  ? `🏛️ Todo el departamento (${municipalities.length} municipios)`
                  : '-- Primero selecciona un departamento --'}
            </option>
            {municipalities.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </select>
          {selectedDepartment && (
            <p className="text-xs text-slate-500 mt-1">
              {selectedMunicipality
                ? 'Filtrado por municipio específico.'
                : `Auditoría a nivel departamental (${municipalities.length} municipios).`}
            </p>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="entity-select" className="block text-sm font-medium text-slate-600">
              Entidad Pública / Descentralizada
            </label>
            {selectedEntity !== 'all' && onEntityChange && (
              <button
                type="button"
                onClick={() => onEntityChange('all')}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Ver Todas
              </button>
            )}
          </div>
          <select
            id="entity-select"
            value={selectedEntity}
            onChange={(e) => onEntityChange?.(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-800"
          >
            <option value="all">🏛️ Todas las entidades (Alcaldías, Gob., Descentralizadas)</option>
            {DECENTRALIZED_ENTITIES.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.icon} {ent.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1 truncate" title={currentEntityDef?.name}>
            {selectedEntity !== 'all' && currentEntityDef
              ? `Auditoría enfocada en ${currentEntityDef.shortName}.`
              : 'Alcaldías, gobernaciones y entidades descentralizadas.'}
          </p>
        </div>
      </div>

      {/* Botón Principal de Consulta Solicitado */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          {currentDeptName ? (
            <span>
              Auditoría lista para:{' '}
              <strong className="text-slate-900">{currentDeptName}</strong>
              {currentMunName && (
                <span>
                  {' '}
                  &gt; <strong className="text-slate-900">{currentMunName}</strong>
                </span>
              )}
              {currentEntityDef && (
                <span>
                  {' '}
                  • <strong className="text-indigo-700">{currentEntityDef.shortName}</strong>
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400">Selecciona un departamento o municipio para activar la consulta</span>
          )}
        </div>

        <button
          type="button"
          id="btn-consultar-contratos"
          onClick={onConsultar}
          disabled={(!selectedDepartment && !selectedMunicipality) || isLoadingContracts}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm"
        >
          {isLoadingContracts ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Consultando SECOP II...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Consultar Contratos</span>
            </>
          )}
        </button>
      </div>

      {/* Botones de acceso rápido a entidades descentralizadas */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>🏢</span>
            <span>Entidades Descentralizadas Disponibles:</span>
          </span>
          {onOpenDecentralizedModal && (
            <button
              type="button"
              onClick={onOpenDecentralizedModal}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1"
            >
              <span>Ver Auditoría Especializada</span>
              <span>→</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onEntityChange?.('all')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-150 flex items-center gap-1.5 ${
              selectedEntity === 'all'
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>🏛️</span>
            <span>Todas</span>
          </button>
          {DECENTRALIZED_ENTITIES.map((ent) => {
            const isSelected = selectedEntity === ent.id;
            return (
              <button
                key={ent.id}
                type="button"
                onClick={() => onEntityChange?.(isSelected ? 'all' : ent.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400 ring-offset-1 font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200'
                }`}
                title={ent.description}
              >
                <span>{ent.icon}</span>
                <span>{ent.shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consultas rápidas por departamento */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Departamentos para consultar rápidamente:
          </span>
          <span className="text-xs text-slate-400">Clic para auditar</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FEATURED_DEPARTMENTS.map((dept) => {
            const isSelected = selectedDepartment === dept.code;
            return (
              <button
                key={dept.code}
                type="button"
                onClick={() => onDepartmentChange(dept.code)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all duration-150 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400 ring-offset-1 font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200'
                }`}
                title={`Consultar ${dept.name} (${dept.capital})`}
              >
                <span>{dept.icon}</span>
                <span>{dept.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(FilterControls);
