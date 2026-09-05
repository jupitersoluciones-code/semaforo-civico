import { describe, it, expect, beforeEach } from 'vitest';
import { detectAnomalies, detectContractSplitting } from '../services/legalAnalysisService';
import { mapRealContractToContract } from '../services/datosGovService';
import { saveAlert, getAlerts, clearAlerts } from '../services/alertService';
import { SemaphoreStatus } from '../utils/types';

describe('Auditoría Anticorrupción y Contratos Avispa', () => {
  it('detecta Contrato Avispa cuando la adición presupuestal supera el 50%', () => {
    const contracts = [
      {
        id_contrato: 'AVISPA-01',
        valor_contrato: 100000000,
        valor_total_con_adiciones: 160000000, // +60% de adición
        modalidad_de_contratacion: 'Licitación Pública',
        proveedor_adjudicado: 'Constructora S.A.',
      },
    ];

    const anomalies = detectAnomalies(contracts, '05001');
    expect(anomalies.some((a) => a.includes('Contrato Avispa'))).toBe(true);
    expect(anomalies.some((a) => a.includes('60%'))).toBe(true);
  });

  it('detecta concentración indebida cuando un proveedor acapara más del 30% del valor', () => {
    const contracts = [
      {
        id_contrato: 'C1',
        valor_contrato: 500000000,
        proveedor_adjudicado: 'Monopolio SAS',
      },
      {
        id_contrato: 'C2',
        valor_contrato: 300000000,
        proveedor_adjudicado: 'Monopolio SAS',
      },
      {
        id_contrato: 'C3',
        valor_contrato: 200000000,
        proveedor_adjudicado: 'Monopolio SAS',
      },
      {
        id_contrato: 'C4',
        valor_contrato: 100000000,
        proveedor_adjudicado: 'Otro Proveedor',
      },
    ];

    const anomalies = detectAnomalies(contracts, '05001');
    expect(anomalies.some((a) => a.includes('concentra el'))).toBe(true);
    expect(anomalies.some((a) => a.includes('Monopolio SAS'))).toBe(true);
  });

  it('detecta contratos en ejecución con fecha de vencimiento expirada', () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const contracts = [
      {
        id_contrato: 'VENCIDO-01',
        valor_contrato: 50000000,
        estado_contrato: 'En ejecución',
        fecha_fin_ejecucion: pastDate,
      },
    ];

    const anomalies = detectAnomalies(contracts, '05001');
    expect(anomalies.some((a) => a.includes('vencida'))).toBe(true);
  });
});

describe('Mapeo de Contratos Reales de SECOP II', () => {
  it('calcula porcentajes verídicos de adición y asigna Semáforo Rojo a contratos avispa', () => {
    const realContract = {
      id_contrato: 'CO1.PCONT.9999',
      objeto_del_contrato: 'Pavimentación vía principal',
      valor_contrato: 200000000,
      valor_total_con_adiciones: 320000000, // +60%
      duracion: 100,
      dias_adicionados: 60, // +60%
      modalidad_de_contratacion: 'Licitación pública',
      proveedor_adjudicado: 'Vías Colombia',
    };

    const mapped = mapRealContractToContract(realContract);
    expect(mapped.moneyAdditionPercentage).toBe(60);
    expect(mapped.timeAdditionPercentage).toBe(60);
    expect(mapped.status).toBe(SemaphoreStatus.Red);
  });
});

describe('Persistencia Segura de Alertas Ciudadanas', () => {
  beforeEach(() => {
    clearAlerts();
  });

  it('registra y recupera alertas ciudadanas exitosamente', async () => {
    await saveAlert({
      projectId: 'PRJ-101',
      projectName: 'Colegio Municipal',
      description: 'Obra abandonada hace 3 meses sin obreros.',
    });

    const alerts = getAlerts();
    expect(alerts.length).toBe(1);
    expect(alerts[0].projectName).toBe('Colegio Municipal');
    expect(alerts[0].status).toBe('Recibida');
  });
});
