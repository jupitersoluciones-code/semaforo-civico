import React from 'react';
import { BoltIcon } from './Icons';

const Header: React.FC = () => {
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
    </header>
  );
};

export default React.memo(Header);
