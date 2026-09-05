import React, { useEffect, useRef, useState, useCallback } from 'react';
import { XIcon } from './Icons';
import { getAlerts, fetchRemoteAlerts, type CitizenAlert } from '../services/alertService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AlertsHistoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [alerts, setAlerts] = useState<CitizenAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    // Carga inmediata de caché local
    setAlerts(getAlerts());
    // Sincronización con el servidor
    const synced = await fetchRemoteAlerts();
    setAlerts(synced);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAlerts();
      closeButtonRef.current?.focus();
    }
  }, [isOpen, loadAlerts]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const statusColors: Record<CitizenAlert['status'], string> = {
    'Recibida': 'bg-blue-100 text-blue-700 border border-blue-200',
    'En Revisión': 'bg-amber-100 text-amber-700 border border-amber-200',
    'Atendida': 'bg-green-100 text-green-700 border border-green-200',
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="alerts-title">
      <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="alerts-title" className="text-lg font-bold text-slate-800">Alertas y Veeduría Comunitaria</h2>
            <p className="text-xs text-slate-500">
              {alerts.length} reporte(s) registrado(s) {isLoading ? '(sincronizando...)' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAlerts}
              disabled={isLoading}
              className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
              title="Sincronizar alertas con el servidor"
            >
              🔄 {isLoading ? 'Cargando' : 'Actualizar'}
            </button>
            <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
              <XIcon className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {alerts.length === 0 && !isLoading && (
            <div className="text-center py-10 text-slate-500 text-sm">
              <span className="text-3xl block mb-2">📢</span>
              No hay alertas ciudadanas registradas aún.<br />
              Puedes generar reportes desde cualquier contrato identificado con anomalías.
            </div>
          )}

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {alerts.map((a) => (
              <div key={a.id} className="border border-slate-200 bg-white rounded-lg p-3.5 shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">{a.projectName}</p>
                    <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap">{a.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>ID: {a.projectId}</span>
                      <span>•</span>
                      <span>{new Date(a.createdAt).toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap ${statusColors[a.status]}`}>
                    {a.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AlertsHistoryModal);
