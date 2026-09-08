import React from 'react';
import { BoltIcon, SearchIcon } from './Icons';

interface Props {
  onOpenContractorsSearch?: () => void;
}

const Header: React.FC<Props> = ({ onOpenContractorsSearch }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40" role="banner">
      <div className="container mx-auto px-4 md:px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <BoltIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                Semáforo Cívico
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block font-medium">
                Control social a la contratación pública
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onOpenContractorsSearch && (
              <button
                onClick={onOpenContractorsSearch}
                className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2"
                title="Búsqueda nacional de entidades públicas compradoras y contratistas"
              >
                <SearchIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar Contratantes</span>
              </button>
            )}
            <a
              href="https://www.datos.gov.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-blue-600 transition-colors hidden md:block font-medium"
            >
              Datos Abiertos Colombia
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);


