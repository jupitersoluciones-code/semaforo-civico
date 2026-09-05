import React, { useState } from 'react';
import type { RealContract } from '../utils/types';
import { ArrowDownTrayIcon } from './Icons';

interface Props {
  contracts: RealContract[];
  municipalityName: string;
}

const ExportButton: React.FC<Props> = ({ contracts, municipalityName }) => {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = () => {
    if (contracts.length === 0) return;
    setIsExporting(true);

    try {
      const headers = [
        'ID Contrato',
        'Entidad',
        'Objeto',
        'Proveedor',
        'Modalidad',
        'Valor',
        'Estado',
        'Fecha Firma',
        'Fecha Inicio',
        'Fecha Fin',
      ];

      const rows = contracts.map((c) => [
        c.id_contrato || c.referencia_del_contrato || '',
        c.nombre_entidad || '',
        (c.objeto_del_contrato || '').replace(/,/g, ';'),
        c.proveedor_adjudicado || '',
        c.modalidad_de_contratacion || '',
        String(c.valor_contrato || 0),
        c.estado_contrato || '',
        c.fecha_de_firma || '',
        c.fecha_inicio_ejecucion || '',
        c.fecha_fin_ejecucion || '',
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `semaforo_civico_${municipalityName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = () => {
    if (contracts.length === 0) return;
    setIsExporting(true);

    try {
      const data = contracts.map((c) => ({
        id: c.id_contrato || c.referencia_del_contrato,
        entidad: c.nombre_entidad,
        objeto: c.objeto_del_contrato,
        proveedor: c.proveedor_adjudicado,
        modalidad: c.modalidad_de_contratacion,
        valor: c.valor_contrato,
        estado: c.estado_contrato,
        fechaFirma: c.fecha_de_firma,
      }));

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `semaforo_civico_${municipalityName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (contracts.length === 0) return null;

  return (
    <div className="relative group">
      <button
        disabled={isExporting}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        {isExporting ? 'Exportando...' : 'Exportar'}
      </button>
      <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
        <button
          onClick={exportToCSV}
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
        >
          Descargar CSV
        </button>
        <button
          onClick={exportToJSON}
          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg"
        >
          Descargar JSON
        </button>
      </div>
    </div>
  );
};

export default React.memo(ExportButton);
