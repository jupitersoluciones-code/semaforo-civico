import { describe, it, expect } from 'vitest';
import {
  evaluateContractorRisk,
  evaluateEntityRisk,
} from '../services/forensicCompanyService';
import type { RealContract } from '../utils/types';

describe('Motor de Auditoría Forense FAEPP: Detección de Empresas de Papel y Evaluación de Licitantes', () => {
  it('detecta alto riesgo de "Empresa de Papel" cuando hay extrema dependencia institucional y contratación directa', () => {
    const mockContracts: RealContract[] = [
      {
        id_contrato: 'CONTRATO-001',
        proveedor_adjudicado: 'Constructora Fantasma SAS',
        nombre_entidad: 'Alcaldía Municipal Sospechosa',
        modalidad_de_contratacion: 'Contratación Directa',
        valor_contrato: 800000000,
        valor_total_con_adiciones: 1300000000, // +62.5% Adición Avispa
        objeto_del_contrato: 'Pavimentación de vías urbanas y suministro de refrigerios escolares PAE',
      },
      {
        id_contrato: 'CONTRATO-002',
        proveedor_adjudicado: 'Constructora Fantasma SAS',
        nombre_entidad: 'Alcaldía Municipal Sospechosa',
        modalidad_de_contratacion: 'Contratación Directa',
        valor_contrato: 450000000,
        objeto_del_contrato: 'Licenciamiento de software y computadores',
      },
    ];

    const profile = evaluateContractorRisk('Constructora Fantasma SAS', mockContracts);

    // Debe superar el umbral crítico o alto
    expect(profile.shellCompanyScore).toBeGreaterThanOrEqual(70);
    expect(profile.riskLevel).toBe('Crítico (Indicio Empresa de Papel)');

    // Banderas rojas esperadas
    expect(profile.directPercentage).toBe(100);
    expect(profile.singleEntityDependencyPct).toBe(100);
    expect(profile.avispaContractsCount).toBe(1);
    expect(profile.redFlags.some((f) => f.includes('contratación a dedo'))).toBe(true);
    expect(profile.redFlags.some((f) => f.includes('Monodependencia'))).toBe(true);
    expect(profile.redFlags.some((f) => f.includes('Avispa'))).toBe(true);
    expect(profile.redFlags.some((f) => f.includes('Objeto Camaleónico'))).toBe(true);
  });

  it('clasifica con Riesgo Bajo a empresas transparentes con licitaciones públicas y sin concentración', () => {
    const mockContracts: RealContract[] = [
      {
        id_contrato: 'PUB-001',
        proveedor_adjudicado: 'Empresa Transparente S.A.',
        nombre_entidad: 'Gobernación de Antioquia',
        modalidad_de_contratacion: 'Licitación Pública',
        valor_contrato: 1000000000,
        valor_total_con_adiciones: 1050000000, // +5% adición moderada
        objeto_del_contrato: 'Construcción de puente vehicular',
      },
      {
        id_contrato: 'PUB-002',
        proveedor_adjudicado: 'Empresa Transparente S.A.',
        nombre_entidad: 'Alcaldía de Medellín',
        modalidad_de_contratacion: 'Selección Abreviada',
        valor_contrato: 900000000,
        objeto_del_contrato: 'Mantenimiento de infraestructura vial',
      },
      {
        id_contrato: 'PUB-003',
        proveedor_adjudicado: 'Empresa Transparente S.A.',
        nombre_entidad: 'Gobernación de Córdoba',
        modalidad_de_contratacion: 'Licitación Pública',
        valor_contrato: 1200000000,
        objeto_del_contrato: 'Pavimentación de tramo secundario',
      },
    ];

    const profile = evaluateContractorRisk('Empresa Transparente S.A.', mockContracts);

    expect(profile.shellCompanyScore).toBeLessThan(20);
    expect(profile.riskLevel).toBe('Bajo');
    expect(profile.directPercentage).toBe(0);
    expect(profile.avispaContractsCount).toBe(0);
  });
});

describe('Motor de Auditoría Forense FAEPP: Evaluación de Entidades Contratantes (Ordenadores del Gasto)', () => {
  it('detecta baja integridad y riesgo alto en entidades con abuso de contratación directa y monopolio', () => {
    const mockContracts: RealContract[] = [
      {
        id_contrato: 'E1',
        nombre_entidad: 'Alcaldía Cautiva',
        proveedor_adjudicado: 'Proveedor Favorito SAS',
        modalidad_de_contratacion: 'Contratación Directa',
        valor_contrato: 700000000,
        valor_total_con_adiciones: 1100000000, // Avispa
      },
      {
        id_contrato: 'E2',
        nombre_entidad: 'Alcaldía Cautiva',
        proveedor_adjudicado: 'Proveedor Favorito SAS',
        modalidad_de_contratacion: 'Contratación Directa',
        valor_contrato: 500000000,
      },
      {
        id_contrato: 'E3',
        nombre_entidad: 'Alcaldía Cautiva',
        proveedor_adjudicado: 'Otro Contratista Menor',
        modalidad_de_contratacion: 'Contratación Directa',
        valor_contrato: 100000000,
      },
      {
        id_contrato: 'E4',
        nombre_entidad: 'Alcaldía Cautiva',
        proveedor_adjudicado: 'Tercer Proveedor',
        modalidad_de_contratacion: 'Mínima Cuantía',
        valor_contrato: 50000000,
      },
      {
        id_contrato: 'E5',
        nombre_entidad: 'Alcaldía Cautiva',
        proveedor_adjudicado: 'Cuarto Proveedor',
        modalidad_de_contratacion: 'Licitación Pública',
        valor_contrato: 150000000,
      },
    ];

    const entityRisk = evaluateEntityRisk('Alcaldía Cautiva', mockContracts);

    expect(entityRisk.integrityScore).toBeLessThan(50);
    expect(['Alto', 'Crítico']).toContain(entityRisk.riskLevel);
    expect(entityRisk.directPercentage).toBeGreaterThan(50);
    expect(entityRisk.redFlags.some((f) => f.includes('Abuso de Contratación Directa'))).toBe(true);
    expect(entityRisk.redFlags.some((f) => f.includes('concentración'))).toBe(true);
  });
});
