import React from 'react';
import { BoltIcon } from './Icons';

interface Props {
  onOpenContractorsSearch?: () => void;
}

const Header: React.FC<Props> = ({ onOpenContractorsSearch }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40" role="banner">
      <div className="container mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BoltIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">
                Semáforo Cívico
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Control social a la contratación pública
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onOpenContractorsSearch && (
              <button
                onClick={onOpenContractorsSearch}
                className="text-xs font-semibold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Búsqueda nacional de entidades públicas compradoras y contratistas"
              >
                <span>🔍</span>
                <span>Buscar Contratantes y Licitantes</span>
              </button>
            )}
            <a
              href="https://www.datos.gov.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 hidden md:block"
            >
              Fuente: Datos Abiertos Colombia
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
