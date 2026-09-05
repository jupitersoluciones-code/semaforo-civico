import { fetchJson } from './apiClient';

export interface GeminiResult {
  text: string;
  error?: string;
}

export async function analyzeContractWithGemini(
  contract: {
    name?: string;
    contractor?: string;
    value?: number;
    procurementMethod?: string;
    executionPercentage?: number;
  },
): Promise<GeminiResult> {
  try {
    const data = await fetchJson<{ text?: string; error?: string }>('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract }),
    });

    if (data.error) {
      return { text: '', error: data.error };
    }

    return { text: data.text || '', error: data.text ? undefined : 'Respuesta vacía del asistente IA' };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : 'Error al consultar el asistente IA';
    return {
      text: '',
      error: errorMsg.includes('503') || errorMsg.includes('404')
        ? 'El servicio de IA no está disponible en este momento. Verifica la configuración del servidor.'
        : errorMsg,
    };
  }
}
