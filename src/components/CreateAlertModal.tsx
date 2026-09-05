import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Project } from '../utils/types';
import { XIcon } from './Icons';
import { saveAlert } from '../services/alertService';

interface Props {
  project: Project;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateAlertModal: React.FC<Props> = ({ project, onClose, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe superar 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await saveAlert({
        projectId: project.id,
        projectName: project.name,
        description: description.trim(),
        photo,
      });
      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSubmitError(err?.message || 'Error al registrar la alerta ciudadana.');
    } finally {
      setIsSubmitting(false);
    }
  }, [description, photo, project, isSubmitting, onSuccess]);

  if (submitted) {
    return (
      <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="alert-title">
        <div className="modal-content max-w-md p-8 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="text-5xl mb-4">✅</div>
          <h2 id="alert-title" className="text-xl font-bold text-slate-800 mb-2">Alerta Registrada</h2>
          <p className="text-slate-600 mb-6">
            Tu reporte ha sido persistido exitosamente en el sistema de auditoría ciudadana. Gracias por tu vigilancia cívica.
          </p>
          <button onClick={onClose} className="btn-primary">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="alert-title">
      <div className="modal-content max-w-lg" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="alert-title" className="text-lg font-bold text-slate-800">Generar Alerta Ciudadana</h2>
          <button ref={closeButtonRef} onClick={onClose} className="p-1 hover:bg-slate-100 rounded" aria-label="Cerrar">
            <XIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-slate-700 line-clamp-2">{project.name}</p>
            <p className="text-xs text-slate-500 mt-1">ID Contrato: {project.id}</p>
          </div>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
              ⚠️ {submitError}
            </div>
          )}

          <div>
            <label htmlFor="alert-description" className="block text-sm font-medium text-slate-700 mb-1">
              Describe la irregularidad observada * (mínimo 10 caracteres)
            </label>
            <textarea
              id="alert-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: La obra presenta sobrecostos evidentes, lleva 4 meses paralizada sin trabajadores en el terreno..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Evidencia fotográfica (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {photo ? 'Cambiar imagen' : 'Adjuntar evidencia (máx. 5MB)'}
            </button>
            {photo && (
              <div className="mt-2 relative">
                <img src={photo} alt="Evidencia fotográfica" className="max-h-40 rounded-md object-contain border" />
                <button
                  onClick={() => setPhoto(null)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  aria-label="Eliminar imagen"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={description.trim().length < 10 || isSubmitting}
            className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin inline-block">⏳</span> Registrando...
              </>
            ) : (
              'Enviar Alerta'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(CreateAlertModal);
