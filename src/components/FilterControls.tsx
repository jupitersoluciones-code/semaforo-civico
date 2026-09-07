import React from 'react';
import type { Department, Municipality } from '../utils/types';
import { FEATURED_DEPARTMENTS } from '../utils/constants';
import { LocationMarkerIcon } from './Icons';

interface Props {
  departments: Department[];
  municipalities: Municipality[];
  selectedDepartment: string;
  selectedMunicipality: string;
  onDepartmentChange: (code: string) => void;
  onMunicipalityChange: (code: string) => void;
  isLoadingMunicipalities: boolean;
}

const FilterControls: React.FC<Props> = ({
  departments,
  municipalities,
  selectedDepartment,
  selectedMunicipality,
  onDepartmentChange,
  onMunicipalityChange,
  isLoadingMunicipalities,
}) => {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-3">
        <LocationMarkerIcon className="w-5 h-5 text-blue-600" />
        <h2 className="font-semibold text-slate-700">Selecciona una ubicación</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  ? `🏛️ Todo el departamento / Nivel Departamental (${municipalities.length} municipios)`
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
