import React from 'react';
import type { Department, Municipality } from '../utils/types';
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
    </div>
  );
};

export default React.memo(FilterControls);
