import { describe, it, expect } from 'vitest';
import {
  buildSoqlWhereClause,
  filterContractsByDecentralizedEntity,
} from '../services/datosGovService';
import { DECENTRALIZED_ENTITIES } from '../utils/constants';
import type { RealContract } from '../utils/types';

describe('Auditoría e Integración de Entidades Descentralizadas', () => {
  it('contiene las 6 entidades descentralizadas solicitadas en el catálogo oficial', () => {
    const ids = DECENTRALIZED_ENTITIES.map((e) => e.id);
    expect(ids).toContain('ese_hospital');
    expect(ids).toContain('sena');
    expect(ids).toContain('ica');
    expect(ids).toContain('ant');
    expect(ids).toContain('inder');
    expect(ids).toContain('aunap');
    expect(DECENTRALIZED_ENTITIES.length).toBe(6);
  });

  describe('Construcción de cláusulas SoQL con filtro de entidad descentralizada', () => {
    it('construye cláusula para SENA a nivel departamental', () => {
      const clause = buildSoqlWhereClause('Córdoba', undefined, false, 'sena');
      expect(clause).toContain("upper(departamento)='CÓRDOBA'");
      expect(clause).toContain("upper(nombre_entidad)='SENA'");
      expect(clause).toContain("upper(nombre_entidad) like '%SERVICIO NACIONAL DE APRENDIZAJE%'");
    });

    it('construye cláusula para E.S.E. Hospitales filtrado por municipio específico (ej. Planeta Rica)', () => {
      const clause = buildSoqlWhereClause('Córdoba', 'Planeta Rica', false, 'ese_hospital');
      expect(clause).toContain("upper(departamento)='CÓRDOBA'");
      expect(clause).toContain("upper(ciudad)='PLANETA RICA'");
      expect(clause).toContain("upper(nombre_entidad) like '%HOSPITAL%'");
      expect(clause).toContain("upper(nombre_entidad) like '%EMPRESA SOCIAL DEL ESTADO%'");
    });

    it('construye cláusula para ICA (Instituto Colombiano Agropecuario)', () => {
      const clause = buildSoqlWhereClause('Cesar', 'Valledupar', false, 'ica');
      expect(clause).toContain("upper(departamento)='CESAR'");
      expect(clause).toContain("upper(nombre_entidad) like '%INSTITUTO COLOMBIANO AGROPECUARIO%'");
      expect(clause).toContain("upper(nombre_entidad)='ICA'");
    });

    it('construye cláusula para Agencia Nacional de Tierras (ANT) considerando ejecución territorial', () => {
      const clause = buildSoqlWhereClause('Córdoba', undefined, false, 'ant');
      expect(clause).toContain("upper(nombre_entidad) like '%AGENCIA NACIONAL DE TIERRAS%'");
      expect(clause).toContain("upper(objeto_del_contrato) like '%CÓRDOBA%'");
    });

    it('construye cláusula para INDER / Institutos de Deporte', () => {
      const clause = buildSoqlWhereClause('Antioquia', 'Medellín', false, 'inder');
      expect(clause).toContain("upper(departamento)='ANTIOQUIA'");
      expect(clause).toContain("upper(nombre_entidad) like '%INDER%'");
      expect(clause).toContain("upper(nombre_entidad) like '%INDEPORTES%'");
    });

    it('construye cláusula para AUNAP (Acuicultura y Pesca)', () => {
      const clause = buildSoqlWhereClause('Magdalena', undefined, false, 'aunap');
      expect(clause).toContain("upper(departamento)='MAGDALENA'");
      expect(clause).toContain("upper(nombre_entidad) like '%AUNAP%'");
      expect(clause).toContain("upper(nombre_entidad) like '%AUTORIDAD NACIONAL DE ACUICULTURA%'");
    });
  });

  describe('Filtrado en memoria filterContractsByDecentralizedEntity', () => {
    const mockContracts: RealContract[] = [
      {
        id_contrato: '1',
        nombre_entidad: 'SERVICIO NACIONAL DE APRENDIZAJE SENA REGIONAL CORDOBA',
        objeto_del_contrato: 'Materiales formativos',
        valor_del_contrato: '50000000',
      },
      {
        id_contrato: '2',
        nombre_entidad: 'E.S.E. HOSPITAL SAN NICOLAS DE PLANETA RICA',
        objeto_del_contrato: 'Suministro de medicamentos',
        valor_del_contrato: '120000000',
      },
      {
        id_contrato: '3',
        nombre_entidad: 'INSTITUTO COLOMBIANO AGROPECUARIO - SECCIONAL CORDOBA',
        objeto_del_contrato: 'Vacunación bovina',
        valor_del_contrato: '30000000',
      },
      {
        id_contrato: '4',
        nombre_entidad: 'AGENCIA NACIONAL DE TIERRAS - ANT',
        objeto_del_contrato: 'Levantamiento topográfico en Córdoba',
        valor_del_contrato: '250000000',
      },
      {
        id_contrato: '5',
        nombre_entidad: 'INSTITUTO MUNICIPAL DE DEPORTES Y RECREACION - IMDER',
        objeto_del_contrato: 'Torneo infantil',
        valor_del_contrato: '15000000',
      },
      {
        id_contrato: '6',
        nombre_entidad: 'AUNAP',
        objeto_del_contrato: 'Fomento a pescadores artesanales',
        valor_del_contrato: '80000000',
      },
      {
        id_contrato: '7',
        nombre_entidad: 'ALCALDÍA DE PLANETA RICA',
        objeto_del_contrato: 'Pavimentación de vías',
        valor_del_contrato: '400000000',
      },
    ];

    it('devuelve todos los contratos cuando el filtro es "all"', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'all');
      expect(filtered.length).toBe(7);
    });

    it('filtra exclusivamente contratos del SENA', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'sena');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id_contrato).toBe('1');
    });

    it('filtra exclusivamente contratos de Hospitales y E.S.E.', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'ese_hospital');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id_contrato).toBe('2');
    });

    it('filtra contratos del ICA', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'ica');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id_contrato).toBe('3');
    });

    it('filtra contratos de la ANT (Agencia Nacional de Tierras)', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'ant');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id_contrato).toBe('4');
    });

    it('filtra contratos de Deporte / INDER', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'inder');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id_contrato).toBe('5');
    });

    it('filtra contratos de AUNAP / UNAP', () => {
      const filtered = filterContractsByDecentralizedEntity(mockContracts, 'aunap');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id_contrato).toBe('6');
    });
  });
});
