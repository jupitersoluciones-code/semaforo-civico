import React from 'react';
import { CheckCircleIcon } from './Icons';

const features = [
  {
    title: 'SECOP',
    description: 'Datos de contratación pública del Sistema Electrónico de Contratación Pública.',
    source: 'datos.gov.co',
    url: 'https://www.datos.gov.co',
  },
  {
    title: 'Plan de Desarrollo',
    description: 'Metas e indicadores de los planes de desarrollo territoriales.',
    source: 'DNP',
    url: 'https://www.dnp.gov.co',
  },
  {
    title: 'Presupuesto',
    description: 'Ejecución presupuestal y datos fiscales de las entidades.',
    source: 'MHCP / DNP',
    url: 'https://www.dnp.gov.co/programas/presupuesto',
  },
  {
    title: 'Acción Ciudadana',
    description: 'Reportes y alertas ciudadanas sobre irregularidades.',
    source: 'Semáforo Cívico',
    url: null,
  },
];

const DetectionPotential: React.FC = () => {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4">Fuentes de Datos</h2>
      <p className="text-sm text-slate-600 mb-4">
        Esta plataforma utiliza datos abiertos de fuentes oficiales colombianas para el control social
        a la contratación pública.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
          >
            <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-slate-700">{f.title}</h3>
              <p className="text-xs text-slate-500">{f.description}</p>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {f.source} →
                </a>
              )}
              {!f.url && (
                <span className="text-xs text-slate-400">{f.source}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(DetectionPotential);
