import React from 'react';
import type { Project, Contract } from '../utils/types';
import { SemaphoreStatus } from '../utils/types';
import SemaphoreIndicator from './SemaphoreIndicator';
import { formatCurrency } from '../utils/formatters';
import { ExclamationIcon } from './Icons';

interface Props {
  project: Project;
  onAlertClick: (project: Project) => void;
  onViewDetailsClick: (contract: Contract) => void;
}

const ProjectCard: React.FC<Props> = ({ project, onAlertClick, onViewDetailsClick }) => {
  const isContract = project.type === 'contract';
  const contract = isContract ? (project as Contract) : null;

  return (
    <div className="card p-4">
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3
          className={`font-semibold text-slate-800 text-sm leading-tight ${
            isContract ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''
          }`}
          onClick={() => contract && onViewDetailsClick(contract)}
          role={isContract ? 'button' : undefined}
          tabIndex={isContract ? 0 : undefined}
          onKeyDown={(e) => {
            if (isContract && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onViewDetailsClick(contract!);
            }
          }}
        >
          {project.name}
        </h3>
        <SemaphoreIndicator status={project.status} size="sm" />
      </div>

      <div className="space-y-2 text-xs text-slate-600">
        {isContract && contract && (
          <>
            <div className="flex justify-between">
              <span>Contratista:</span>
              <span className="font-medium text-slate-700 text-right truncate max-w-[60%]">
                {contract.contractor}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Valor:</span>
              <span className="font-medium text-slate-700">{formatCurrency(contract.value)}</span>
            </div>
            <div className="flex justify-between">
              <span>Modalidad:</span>
              <span className="font-medium text-slate-700">{contract.procurementMethod}</span>
            </div>
          </>
        )}

        {project.type === 'goal' && (
          <>
            <div className="flex justify-between">
              <span>Entidad:</span>
              <span className="font-medium text-slate-700">{project.responsibleEntity}</span>
            </div>
            <div className="flex justify-between">
              <span>Presupuesto:</span>
              <span className="font-medium text-slate-700">{formatCurrency(project.budget)}</span>
            </div>
          </>
        )}
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Ejecución</span>
          <span className="font-medium">{project.executionPercentage}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2" role="progressbar" aria-valuenow={project.executionPercentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Ejecución ${project.executionPercentage}%`}>
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              project.status === SemaphoreStatus.Green
                ? 'bg-green-500'
                : project.status === SemaphoreStatus.Yellow
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${project.executionPercentage}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => onAlertClick(project)}
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
        >
          <ExclamationIcon className="w-4 h-4" />
          Generar Alerta
        </button>
      </div>
    </div>
  );
};

export default React.memo(ProjectCard);
