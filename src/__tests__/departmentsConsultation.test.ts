import { describe, it, expect } from 'vitest';
import {
  resolveDepartmentCode,
  normalizeSecopDepartment,
  fetchMunicipalitiesByDepartment,
  buildSoqlWhereClause,
} from '../services/datosGovService';
import { FEATURED_DEPARTMENTS, DEPARTMENTS, MUNICIPALITIES } from '../utils/constants';

describe('Consulta de Departamentos Solicitados', () => {
  const requestedDepartments = [
    { input: 'cordoba', expectedCode: '23', expectedName: 'Córdoba' },
    { input: 'atlantico', expectedCode: '08', expectedName: 'Atlántico' },
    { input: 'bolivar', expectedCode: '13', expectedName: 'Bolívar' },
    { input: 'cesar', expectedCode: '20', expectedName: 'Cesar' },
    { input: 'magdalena', expectedCode: '47', expectedName: 'Magdalena' },
    { input: 'guajira', expectedCode: '44', expectedName: 'La Guajira' },
    { input: 'sucre', expectedCode: '70', expectedName: 'Sucre' },
    { input: 'risaralda', expectedCode: '66', expectedName: 'Risaralda' },
    { input: 'caldas', expectedCode: '17', expectedName: 'Caldas' },
    { input: 'guaviare', expectedCode: '95', expectedName: 'Guaviare' },
    { input: 'vichada', expectedCode: '99', expectedName: 'Vichada' },
    { input: 'casanare', expectedCode: '85', expectedName: 'Casanare' },
  ];

  it('resuelve correctamente los códigos de los 12 departamentos solicitados tanto por nombre como por código', () => {
    for (const item of requestedDepartments) {
      // Búsqueda por nombre en minúsculas sin tildes
      const codeByName = resolveDepartmentCode(item.input);
      expect(codeByName, `Error resolviendo por nombre: ${item.input}`).toBe(item.expectedCode);

      // Búsqueda por código oficial
      const codeByCode = resolveDepartmentCode(item.expectedCode);
      expect(codeByCode, `Error resolviendo por código: ${item.expectedCode}`).toBe(item.expectedCode);

      // Búsqueda por nombre oficial con tildes
      const codeByOfficialName = resolveDepartmentCode(item.expectedName);
      expect(codeByOfficialName, `Error resolviendo por nombre oficial: ${item.expectedName}`).toBe(item.expectedCode);
    }
  });

  it('normaliza para SECOP II los nombres con sus respectivas variantes de tildes o alias', () => {
    // La Guajira debe incluir tanto 'La Guajira' como 'Guajira'
    const guajiraSecop = normalizeSecopDepartment('guajira');
    expect(guajiraSecop).toContain('La Guajira');
    expect(guajiraSecop).toContain('Guajira');

    // Córdoba debe normalizarse para SECOP II
    const cordobaSecop = normalizeSecopDepartment('cordoba');
    expect(cordobaSecop).toContain('Córdoba');

    // Atlántico debe normalizarse para SECOP II
    const atlanticoSecop = normalizeSecopDepartment('atlantico');
    expect(atlanticoSecop).toContain('Atlántico');

    // Bolívar debe normalizarse para SECOP II
    const bolivarSecop = normalizeSecopDepartment('bolivar');
    expect(bolivarSecop).toContain('Bolívar');
  });

  it('cuenta con municipios disponibles para cada uno de los 12 departamentos', async () => {
    for (const item of requestedDepartments) {
      const muns = await fetchMunicipalitiesByDepartment(item.expectedCode);
      expect(muns.length, `El departamento ${item.expectedName} debe tener municipios`).toBeGreaterThan(0);
    }
  });

  it('incluye los 12 departamentos en la lista de FEATURED_DEPARTMENTS para consulta rápida', () => {
    const featuredCodes = FEATURED_DEPARTMENTS.map((d) => d.code);
    for (const item of requestedDepartments) {
      expect(featuredCodes, `FEATURED_DEPARTMENTS debe incluir ${item.expectedName}`).toContain(item.expectedCode);
    }
  });

  it('construye cláusula WHERE robusta y de alto rendimiento para municipios buscando en ciudad y entidad', () => {
    const clause = buildSoqlWhereClause('Córdoba', 'Planeta Rica');
    
    // Debe incluir condición de departamento (con y sin tildes)
    expect(clause).toContain("upper(departamento)='CÓRDOBA'");
    expect(clause).toContain("upper(departamento)='CORDOBA'");

    // Debe buscar por igualdad exacta en ciudad (rápido en Socrata) y por LIKE en nombre_entidad
    expect(clause).toContain("upper(ciudad)='PLANETA RICA'");
    expect(clause).toContain("upper(nombre_entidad) like '%PLANETA RICA%'");
    // NO debe incluir LIKE en ciudad porque satura y agota el tiempo de respuesta de Socrata
    expect(clause).not.toContain("upper(ciudad) like '%PLANETA RICA%'");
  });

  it('construye cláusula WHERE compatible con el dataset de procesos SECOP II (p6dx-8zbt)', () => {
    const clause = buildSoqlWhereClause('Córdoba', 'Planeta Rica', true);
    
    // En procesos las columnas son departamento_entidad, ciudad_entidad y entidad
    expect(clause).toContain("upper(departamento_entidad)='CÓRDOBA'");
    expect(clause).toContain("upper(ciudad_entidad)='PLANETA RICA'");
    expect(clause).toContain("upper(entidad) like '%PLANETA RICA%'");
    expect(clause).not.toContain("upper(departamento)='");
  });
});

