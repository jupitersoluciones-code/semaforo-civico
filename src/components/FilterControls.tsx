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
}) => {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <LocationMarkerIcon className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-slate-700">Selecciona una ubicación y entidad a auditar</h2>
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
                className="text-xs text-blue-600 hover:underline"
              >
                Todas
              </button>
            )}
          </div>
          <select
            id="entity-select"
            value={selectedEntity}
            onChange={(e) => onEntityChange?.(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">🏛️ Todas las entidades (Alcaldías, Gob., Descentralizadas)</option>
            {DECENTRALIZED_ENTITIES.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.icon} {ent.shortName}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1 truncate" title={DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity)?.name}>
            {selectedEntity !== 'all'
              ? `Filtrado por ${DECENTRALIZED_ENTITIES.find((e) => e.id === selectedEntity)?.shortName}.`
              : 'Alcaldías, gobernaciones y entidades descentralizadas.'}
          </p>
        </div>
      </div>

      {/* Botones de acceso rápido a entidades descentralizadas */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <span>🏢</span>
            <span>Entidades Descentralizadas a Auditar:</span>
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
