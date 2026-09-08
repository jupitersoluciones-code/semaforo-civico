import { fetchWithCache, fetchJson } from './apiClient';
import type { RealContract, Contract, Department, Municipality, DecentralizedEntityId } from '../utils/types';
import { DEPARTMENTS, MUNICIPALITIES, DECENTRALIZED_ENTITIES } from '../utils/constants';

const SOCRATA_BASE_URL = 'https://www.datos.gov.co/resource';
const SECOP_CONTRACTS_ID = 'jbjy-vk9h';
const SECOP_PROCESSES_ID = 'p6dx-8zbt';

export async function fetchDepartments(): Promise<Department[]> {
  return new Promise((resolve) => setTimeout(() => resolve(DEPARTMENTS), 30));
}

export async function fetchMunicipalitiesByDepartment(departmentCodeOrName: string): Promise<Municipality[]> {
  const resolvedCode = resolveDepartmentCode(departmentCodeOrName) || departmentCodeOrName;
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          MUNICIPALITIES.filter((m) => m.departmentCode === resolvedCode).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        ),
      30,
    ),
  );
}

export function stripAccents(str: string): string {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export const SECOP_DEPARTMENT_MAP: Record<string, string[]> = {
  '11': ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'],
  'Bogotá, D.C.': ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'],
  'Bogota, D.C.': ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'],
  'Bogotá': ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'],
  'Bogota': ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'],
  '44': ['La Guajira', 'Guajira'],
  'La Guajira': ['La Guajira', 'Guajira'],
  'Guajira': ['La Guajira', 'Guajira'],
  '88': ['San Andrés, Providencia y Santa Catalina', 'San Andrés y Providencia'],
  'San Andrés y Providencia': ['San Andrés, Providencia y Santa Catalina', 'San Andrés y Providencia'],
  'San Andres y Providencia': ['San Andrés, Providencia y Santa Catalina', 'San Andrés y Providencia'],
};

export function resolveDepartmentCode(codeOrName: string): string | undefined {
  const clean = (codeOrName || '').trim();
  if (!clean) return undefined;

  // Check code directly
  const byCode = DEPARTMENTS.find((d) => d.code === clean);
  if (byCode) return byCode.code;

  const cleanLower = stripAccents(clean.toLowerCase());

  // Specific alias checks
  if (cleanLower === 'guajira' || cleanLower === 'la guajira') return '44';
  if (cleanLower.includes('bogot')) return '11';
  if (cleanLower.includes('san andres')) return '88';

  // Check by accent-free name
  const byName = DEPARTMENTS.find((d) => {
    const dLower = stripAccents(d.name.toLowerCase());
    return dLower === cleanLower || dLower.includes(cleanLower) || cleanLower.includes(dLower);
  });

  return byName?.code;
}

export function normalizeSecopDepartment(deptCodeOrName: string): string[] {
  const clean = (deptCodeOrName || '').trim();
  if (!clean) return [];

  // Check direct mapping
  if (SECOP_DEPARTMENT_MAP[clean]) {
    return SECOP_DEPARTMENT_MAP[clean];
  }

  const cleanLower = stripAccents(clean.toLowerCase());

  // Special aliases:
  if (clean === '11' || cleanLower.includes('bogot')) {
    return ['Distrito Capital de Bogotá', 'Bogotá', 'Bogota'];
  }
  if (clean === '88' || cleanLower.includes('san andres')) {
    return ['San Andrés, Providencia y Santa Catalina', 'San Andrés y Providencia'];
  }
  if (clean === '44' || cleanLower === 'guajira' || cleanLower === 'la guajira') {
    return ['La Guajira', 'Guajira'];
  }

  // Check department code
  const deptByCode = DEPARTMENTS.find((d) => d.code === clean);
  if (deptByCode) {
    if (SECOP_DEPARTMENT_MAP[deptByCode.code]) return SECOP_DEPARTMENT_MAP[deptByCode.code];
    if (SECOP_DEPARTMENT_MAP[deptByCode.name]) return SECOP_DEPARTMENT_MAP[deptByCode.name];
    return [deptByCode.name];
  }

  // Check by name matching (accent-insensitive)
  const deptByName = DEPARTMENTS.find(
    (d) =>
      stripAccents(d.name.toLowerCase()) === cleanLower ||
      stripAccents(d.name.toLowerCase()).includes(cleanLower) ||
      cleanLower.includes(stripAccents(d.name.toLowerCase())),
  );
  if (deptByName) {
    if (SECOP_DEPARTMENT_MAP[deptByName.code]) return SECOP_DEPARTMENT_MAP[deptByName.code];
    if (SECOP_DEPARTMENT_MAP[deptByName.name]) return SECOP_DEPARTMENT_MAP[deptByName.name];
    return [deptByName.name];
  }

  return [clean];
}

function getDeptInfo(codeOrName: string): Department | undefined {
  const resolvedCode = resolveDepartmentCode(codeOrName) || codeOrName;
  return DEPARTMENTS.find((d) => d.code === resolvedCode);
}

function getMunInfo(code: string): Municipality | undefined {
  return MUNICIPALITIES.find((m) => m.code === code);
}


type ModalidadType = 'Licitación Pública' | 'Contratación Directa' | 'Mínima Cuantía' | 'Selección Abreviada';

function normalizeModalidad(modalidad: string | undefined): ModalidadType {
  const m = (modalidad || '').toLowerCase();
  if (m.includes('licitación') || m.includes('licitacion')) return 'Licitación Pública';
  if (m.includes('directa')) return 'Contratación Directa';
  if (m.includes('mínima') || m.includes('minima')) return 'Mínima Cuantía';
  if (m.includes('abreviada')) return 'Selección Abreviada';
  return 'Contratación Directa';
}

export function buildSoqlWhereClause(
  deptNameOrCode: string,
  cityName?: string,
  isProcessDataset = false,
  entityFilter?: string,
): string {
  const deptCol = isProcessDataset ? 'departamento_entidad' : 'departamento';
  const cityCol = isProcessDataset ? 'ciudad_entidad' : 'ciudad';
  const entityCol = isProcessDataset ? 'entidad' : 'nombre_entidad';
  const descCol = isProcessDataset ? 'descripci_n_del_procedimiento' : 'objeto_del_contrato';

  const resolvedDepts = normalizeSecopDepartment(deptNameOrCode);
  const deptConditions: string[] = [];

  for (const d of resolvedDepts) {
    const dUpper = d.toUpperCase().replace(/'/g, "''");
    const dNoAccents = stripAccents(dUpper);
    deptConditions.push(`upper(${deptCol})='${dUpper}'`);
    if (dNoAccents !== dUpper) {
      deptConditions.push(`upper(${deptCol})='${dNoAccents}'`);
    }
  }

  if (deptConditions.length === 0) {
    const dUpper = deptNameOrCode.toUpperCase().replace(/'/g, "''");
    deptConditions.push(`upper(${deptCol})='${dUpper}'`);
  }

  const deptClause = `(${deptConditions.join(' OR ')})`;

  // Si no hay filtro de entidad descentralizada, comportamiento normal
  if (!entityFilter || entityFilter === 'all') {
    let clause = deptClause;
    if (cityName && cityName.trim()) {
      const cleanCity = cityName.trim();
      if (cleanCity.toLowerCase().includes('bogot')) {
        clause += ` AND (upper(${cityCol})='BOGOTÁ' OR upper(${cityCol})='BOGOTA' OR upper(${cityCol})='DISTRITO CAPITAL' OR upper(${cityCol})='NO DEFINIDO')`;
      } else {
        const cityUpper = cleanCity.toUpperCase().replace(/'/g, "''");
        const cityNoAccents = stripAccents(cityUpper);
        const cityConds = [
          `upper(${cityCol})='${cityUpper}'`,
          `upper(${cityCol})='${cityNoAccents}'`,
          `upper(${entityCol}) like '%${cityUpper}%'`,
          `upper(${entityCol}) like '%${cityNoAccents}%'`,
        ];
        const uniqueCityConds = Array.from(new Set(cityConds));
        clause += ` AND (${uniqueCityConds.join(' OR ')})`;
      }
    }
    return clause;
  }

  // Soporte especializado para entidades descentralizadas
  const entityDef = DECENTRALIZED_ENTITIES.find((e) => e.id === entityFilter);
  if (!entityDef) {
    return deptClause;
  }

  const entityConds = entityDef.patterns.map((p) => {
    if (p.length <= 4) {
      return `upper(${entityCol})='${p}' OR upper(${entityCol}) like '${p} %' OR upper(${entityCol}) like '% ${p}' OR upper(${entityCol}) like '% ${p} %' OR upper(${entityCol}) like '% - ${p}%'`;
    }
    return `upper(${entityCol}) like '%${p}%'`;
  });
  const entityMatch = `(${entityConds.join(' OR ')})`;

  if (entityDef.scope === 'national_territorial') {
    const dUpper = deptNameOrCode.toUpperCase().replace(/'/g, "''");
    const dNoAcc = stripAccents(dUpper);
    const territorialMatch = `(${deptClause} OR upper(${descCol}) like '%${dUpper}%' OR upper(${descCol}) like '%${dNoAcc}%')`;

    if (cityName && cityName.trim()) {
      const cUpper = cityName.trim().toUpperCase().replace(/'/g, "''");
      const cNoAcc = stripAccents(cUpper);
      return `${entityMatch} AND (${territorialMatch} OR upper(${descCol}) like '%${cUpper}%' OR upper(${descCol}) like '%${cNoAcc}%' OR upper(${cityCol})='${cUpper}')`;
    }
    return `${entityMatch} AND ${territorialMatch}`;
  }

  // Entidades regionales/departamentales (sena, ica, inder, ese_hospital)
  let clause = `${deptClause} AND ${entityMatch}`;
  if (cityName && cityName.trim()) {
    const cUpper = cityName.trim().toUpperCase().replace(/'/g, "''");
    const cNoAcc = stripAccents(cUpper);
    const cityConds = [
      `upper(${cityCol})='${cUpper}'`,
      `upper(${cityCol})='${cNoAcc}'`,
      `upper(${entityCol}) like '%${cUpper}%'`,
      `upper(${entityCol}) like '%${cNoAcc}%'`,
    ];
    clause += ` AND (${cityConds.join(' OR ')})`;
  }

  return clause;
}

export async function fetchContractsByDepartment(
  departmentCode: string,
  limit = 200,
): Promise<RealContract[]> {
  const resolvedCode = resolveDepartmentCode(departmentCode) || departmentCode;
  const dept = getDeptInfo(resolvedCode);
  const deptName = dept?.name || departmentCode;
  const whereClause = buildSoqlWhereClause(deptName);
  const cacheKey = `contracts_dept_${resolvedCode}_${limit}`;

  // 1. Intento primario: a través del Proxy Serverless /api/secop
  const proxyUrl = `/api/secop?where=${encodeURIComponent(whereClause)}&limit=${limit}&resourceId=${SECOP_CONTRACTS_ID}`;
  try {
    const contracts = await fetchWithCache<RealContract[]>(proxyUrl, cacheKey);
    if (Array.isArray(contracts) && contracts.length > 0) {
      return contracts;
    }
  } catch (proxyError) {
    console.warn('Proxy /api/secop no disponible para departamento, usando consulta directa:', proxyError);
  }

  // 2. Respaldo secundario: consulta directa a Socrata
  const params = new URLSearchParams({
    $where: whereClause,
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  const directUrl = `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${params.toString()}`;
  try {
    const contracts = await fetchWithCache<RealContract[]>(directUrl, cacheKey);
    return Array.isArray(contracts) ? contracts : [];
  } catch (error) {
    console.error('Error al consultar contratos por departamento:', error);
    return [];
  }
}

export async function fetchContractsByMunicipality(
  municipalityCode: string,
  limit = 100,
): Promise<RealContract[]> {
  const departmentCode = municipalityCode.substring(0, 2);
  const dept = getDeptInfo(departmentCode);
  const mun = getMunInfo(municipalityCode);

  if (!dept) return [];

  const deptName = dept.name;
  const cityName = mun?.name || '';

  const cacheKey = `contracts_mun_v3_${municipalityCode}_${limit}`;
  const whereClause = buildSoqlWhereClause(deptName, cityName);

  // 1. Intento primario: a través del Proxy Serverless /api/secop (aprovecha App Token y caché Edge)
  const proxyUrl = `/api/secop?where=${encodeURIComponent(whereClause)}&limit=${limit}&resourceId=${SECOP_CONTRACTS_ID}`;

  try {
    const contracts = await fetchWithCache<RealContract[]>(proxyUrl, cacheKey);
    if (Array.isArray(contracts) && contracts.length > 0) {
      return contracts;
    }
  } catch (proxyError) {
    console.warn('Proxy /api/secop no disponible o falló, recurriendo a consulta directa:', proxyError);
  }

  // 2. Respaldo secundario: consulta directa a Socrata
  const params = new URLSearchParams({
    $where: whereClause,
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  const directUrl = `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${params.toString()}`;

  try {
    const contracts = await fetchWithCache<RealContract[]>(directUrl, cacheKey);
    if (Array.isArray(contracts) && contracts.length > 0) {
      return contracts;
    }
  } catch (error) {
    console.warn('Fallo consulta con ciudad específica:', error);
  }

  return [];
}

function matchesEntityPattern(text: string, pattern: string): boolean {
  if (pattern.length <= 4) {
    const regex = new RegExp(`(^|[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ])${pattern}([^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]|$)`, 'i');
    return regex.test(text);
  }
  return text.toUpperCase().includes(pattern.toUpperCase());
}

export function filterContractsByDecentralizedEntity(
  contracts: RealContract[],
  entityId: string,
): RealContract[] {
  if (!entityId || entityId === 'all') return contracts;
  const def = DECENTRALIZED_ENTITIES.find((e) => e.id === entityId);
  if (!def) return contracts;

  return contracts.filter((c) => {
    const entityName = c.nombre_entidad || c.entidad || '';
    const objectDesc = c.objeto_del_contrato || c.descripcion_del_proceso || '';

    // 1. Coincidencia directa por nombre de la entidad
    const matchEntity = def.patterns.some((pattern) => matchesEntityPattern(entityName, pattern));
    if (matchEntity) return true;

    // 2. Coincidencia por contratista adjudicado (ej: Municipio adjudica a su Hospital/E.S.E.)
    const contractor = c.proveedor_adjudicado || '';
    if (entityId === 'ese_hospital') {
      const matchProvider = def.patterns.some((pattern) => matchesEntityPattern(contractor, pattern));
      if (matchProvider) return true;
      if (matchesEntityPattern(objectDesc, 'PLAN DE INTERVENCIONES COLECTIVAS')) return true;
    }

    // 3. Para entidades nacionales con ejecución territorial (ANT, AUNAP), verificar objeto
    if (def.scope === 'national_territorial') {
      const matchObject = def.patterns.some((pattern) => matchesEntityPattern(objectDesc, pattern));
      if (matchObject) return true;
    }

    return false;
  });
}

async function executeSecopQuery(
  whereClause: string,
  cacheKey: string,
  limit: number,
): Promise<RealContract[]> {
  // 1. Intento primario: proxy
  const proxyUrl = `/api/secop?where=${encodeURIComponent(whereClause)}&limit=${limit}&resourceId=${SECOP_CONTRACTS_ID}`;
  try {
    const contracts = await fetchWithCache<RealContract[]>(proxyUrl, cacheKey);
    if (Array.isArray(contracts) && contracts.length > 0) {
      return contracts;
    }
  } catch (proxyErr) {
    console.warn('Proxy no disponible para consulta SECOP, usando directo:', proxyErr);
  }

  // 2. Intento secundario: consulta directa a Socrata
  const params = new URLSearchParams({
    $where: whereClause,
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  const directUrl = `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${params.toString()}`;
  try {
    const contracts = await fetchWithCache<RealContract[]>(directUrl, cacheKey);
    return Array.isArray(contracts) ? contracts : [];
  } catch (err) {
    console.warn('Fallo consulta directa SECOP:', err);
    return [];
  }
}

export async function fetchContractsByDecentralizedEntity(
  entityId: DecentralizedEntityId,
  departmentCode: string,
  municipalityCode?: string,
  limit = 200,
): Promise<RealContract[]> {
  if (!entityId || entityId === 'all') {
    return municipalityCode
      ? fetchContractsByMunicipality(municipalityCode, limit)
      : fetchContractsByDepartment(departmentCode, limit);
  }

  const resolvedDeptCode = resolveDepartmentCode(departmentCode) || departmentCode;
  const dept = getDeptInfo(resolvedDeptCode);
  const deptName = dept?.name || departmentCode;
  const mun = municipalityCode ? getMunInfo(municipalityCode) : undefined;
  const cityName = mun?.name || '';
  const def = DECENTRALIZED_ENTITIES.find((e) => e.id === entityId);

  const dUpper = deptName.toUpperCase().replace(/'/g, "''");
  const dNoAcc = stripAccents(dUpper);
  const deptCond =
    dNoAcc !== dUpper
      ? `(upper(departamento)='${dUpper}' OR upper(departamento)='${dNoAcc}')`
      : `upper(departamento)='${dUpper}'`;

  const entityPatterns = def?.patterns || [entityId.toUpperCase()];
  const entityConds = entityPatterns
    .map((p) => {
      if (p.length <= 4) {
        return `upper(nombre_entidad)='${p}' OR upper(nombre_entidad) like '${p} %' OR upper(nombre_entidad) like '% ${p}' OR upper(nombre_entidad) like '% ${p} %' OR upper(nombre_entidad) like '% - ${p}%'`;
      }
      return `upper(nombre_entidad) like '%${p}%'`;
    })
    .join(' OR ');
  const entityMatch = `(${entityConds})`;

  // Nivel 1: Si hay municipio especificado, aislar ESTRICTAMENTE los contratos de ese municipio.
  // Bajo ninguna circunstancia mezclar hospitales o contratos de otros municipios.
  if (cityName && cityName.trim()) {
    const cUpper = cityName.trim().toUpperCase().replace(/'/g, "''");
    const cNoAcc = stripAccents(cUpper);

    const cityMatch =
      cNoAcc !== cUpper
        ? `(upper(ciudad)='${cUpper}' OR upper(ciudad)='${cNoAcc}' OR upper(nombre_entidad) like '%${cUpper}%' OR upper(nombre_entidad) like '%${cNoAcc}%')`
        : `(upper(ciudad)='${cUpper}' OR upper(nombre_entidad) like '%${cUpper}%')`;

    let whereMun = '';
    if (entityId === 'ese_hospital') {
      // 1. Hospital / ESE con sede o nombre en este municipio
      // 2. O Alcaldía municipal contratando a su Hospital/ESE o ejecutando Plan de Intervenciones Colectivas (PIC)
      whereMun = `${deptCond} AND (` +
        `((upper(nombre_entidad) like '%HOSPITAL%' OR upper(nombre_entidad) like '%EMPRESA SOCIAL DEL ESTADO%' OR upper(nombre_entidad) like '%E.S.E%' OR upper(nombre_entidad) like '%CAMU%') AND ${cityMatch})` +
        ` OR ` +
        `(${cityMatch} AND (upper(proveedor_adjudicado) like '%HOSPITAL%' OR upper(proveedor_adjudicado) like '%E.S.E%' OR upper(proveedor_adjudicado) like '%CAMU%' OR upper(objeto_del_contrato) like '%HOSPITAL%' OR upper(objeto_del_contrato) like '%PLAN DE INTERVENCIONES COLECTIVAS%'))` +
      `)`;
    } else if (entityId === 'inder') {
      // Instituto deportivo local o Alcaldía contratando recreación/deporte en este municipio
      whereMun = `${deptCond} AND (` +
        `((upper(nombre_entidad) like '%INDER%' OR upper(nombre_entidad) like '%IMDER%' OR upper(nombre_entidad) like '%DEPORTE%') AND ${cityMatch})` +
        ` OR ` +
        `(${cityMatch} AND (upper(objeto_del_contrato) like '%DEPORTE%' OR upper(objeto_del_contrato) like '%RECREACION%' OR upper(objeto_del_contrato) like '%ESCENARIO DEPORTIVO%'))` +
      `)`;
    } else if (entityId === 'ant' || entityId === 'aunap') {
      // Entidades nacionales con ejecución directa en este municipio
      whereMun = `${entityMatch} AND (upper(ciudad)='${cUpper}' OR upper(ciudad)='${cNoAcc}' OR upper(objeto_del_contrato) like '%${cUpper}%' OR upper(objeto_del_contrato) like '%${cNoAcc}%')`;
    } else {
      // SENA, ICA: operaciones o centros directamente vinculados a este municipio
      whereMun = `${deptCond} AND ${entityMatch} AND (upper(ciudad)='${cUpper}' OR upper(ciudad)='${cNoAcc}' OR upper(objeto_del_contrato) like '%${cUpper}%' OR upper(objeto_del_contrato) like '%${cNoAcc}%')`;
    }

    const cacheKeyMun = `decent_v5_strict_mun_${entityId}_${resolvedDeptCode}_${municipalityCode}_${limit}`;
    const municipalContracts = await executeSecopQuery(whereMun, cacheKeyMun, limit);

    // Si el municipio tiene contratos directos, devolverlos.
    // Si no tiene contratos directos en SECOP II, devolver array vacío []
    // NUNCA desbordar a hospitales o contratos de otros municipios.
    return municipalContracts;
  }

  // Nivel 2: Cobertura Departamental (únicamente cuando NO se especifica municipio, ej. "🏛️ Todo el departamento")
  let whereDept = '';
  if (entityId === 'ant' || entityId === 'aunap') {
    whereDept = `${entityMatch} AND (upper(objeto_del_contrato) like '%${dUpper}%' OR upper(objeto_del_contrato) like '%${dNoAcc}%' OR ${deptCond})`;
  } else {
    whereDept = `${deptCond} AND ${entityMatch}`;
  }

  const cacheKeyDept = `decent_v5_dept_${entityId}_${resolvedDeptCode}_${limit}`;
  const deptContracts = await executeSecopQuery(whereDept, cacheKeyDept, limit);
  if (deptContracts.length > 0) {
    return deptContracts;
  }

  // Nivel 3: Fallback Nacional para entidades con registro centralizado (AUNAP, ANT) a nivel país
  if (entityId === 'aunap' || entityId === 'ant') {
    const cacheKeyNat = `decent_v5_nat_${entityId}_${limit}`;
    const natContracts = await executeSecopQuery(entityMatch, cacheKeyNat, limit);
    return natContracts;
  }

  return [];
}

export async function fetchContractProcessesByMunicipality(
  municipalityCode: string,
  limit = 100,
): Promise<RealContract[]> {
  const departmentCode = municipalityCode.substring(0, 2);
  const dept = getDeptInfo(departmentCode);
  const mun = getMunInfo(municipalityCode);

  if (!dept) return [];

  const deptName = dept.name;
  const cityName = mun?.name || '';
  const cacheKey = `processes_${municipalityCode}_${limit}`;
  const whereClause = buildSoqlWhereClause(deptName, cityName, true);

  // Intentar proxy primero
  const proxyUrl = `/api/secop?where=${encodeURIComponent(whereClause)}&limit=${limit}&resourceId=${SECOP_PROCESSES_ID}`;
  try {
    const processes = await fetchWithCache<RealContract[]>(proxyUrl, cacheKey);
    if (Array.isArray(processes) && processes.length > 0) return processes;
  } catch {
    // Fallback a Socrata directo
  }

  const params = new URLSearchParams({
    $where: whereClause,
    $order: 'fecha_de_publicacion_del DESC',
    $limit: String(limit),
  });

  const url = `${SOCRATA_BASE_URL}/${SECOP_PROCESSES_ID}.json?${params.toString()}`;

  try {
    const data = await fetchWithCache<RealContract[]>(url, cacheKey);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching processes:', error);
    return [];
  }
}

export async function searchContractsByText(
  text: string,
  limit = 50,
): Promise<RealContract[]> {
  const cleanText = text.replace(/'/g, "''");

  // Intentar por proxy primero
  try {
    const data = await fetchJson<RealContract[]>(
      `/api/secop?query=${encodeURIComponent(cleanText)}&limit=${limit}`,
    );
    if (Array.isArray(data) && data.length > 0) return data;
  } catch {
    // Fallback a directo
  }

  const params = new URLSearchParams({
    $where: `objeto_del_contrato like '%25${cleanText}%25'`,
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  const url = `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${params.toString()}`;

  try {
    return await fetchJson<RealContract[]>(url);
  } catch (error) {
    console.error('Error searching contracts:', error);
    return [];
  }
}

export async function fetchContractsByContractor(
  contractorName: string,
  limit = 100,
): Promise<RealContract[]> {
  const clean = contractorName.trim().replace(/'/g, "''").toUpperCase();
  const whereClause = `upper(proveedor_adjudicado) like '%25${clean}%25'`;
  const cacheKey = `contractor_${clean}_${limit}`;

  // 1. Proxy
  const proxyUrl = `/api/secop?where=${encodeURIComponent(whereClause)}&limit=${limit}&resourceId=${SECOP_CONTRACTS_ID}`;
  try {
    const contracts = await fetchWithCache<RealContract[]>(proxyUrl, cacheKey);
    if (Array.isArray(contracts) && contracts.length > 0) return contracts;
  } catch {
    // Fallback
  }

  // 2. Directo Socrata
  const params = new URLSearchParams({
    $where: whereClause,
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  try {
    const directUrl = `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${params.toString()}`;
    const contracts = await fetchWithCache<RealContract[]>(directUrl, cacheKey);
    return Array.isArray(contracts) ? contracts : [];
  } catch (err) {
    console.error('Error al consultar contratos por contratista:', err);
    return [];
  }
}

export async function fetchContractsByEntityName(
  entityName: string,
  limit = 100,
): Promise<RealContract[]> {
  const clean = entityName.trim().replace(/'/g, "''").toUpperCase();
  const whereClause = `upper(nombre_entidad) like '%25${clean}%25'`;
  const cacheKey = `entity_${clean}_${limit}`;

  // 1. Proxy
  const proxyUrl = `/api/secop?where=${encodeURIComponent(whereClause)}&limit=${limit}&resourceId=${SECOP_CONTRACTS_ID}`;
  try {
    const contracts = await fetchWithCache<RealContract[]>(proxyUrl, cacheKey);
    if (Array.isArray(contracts) && contracts.length > 0) return contracts;
  } catch {
    // Fallback
  }

  // 2. Directo Socrata
  const params = new URLSearchParams({
    $where: whereClause,
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  try {
    const directUrl = `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${params.toString()}`;
    const contracts = await fetchWithCache<RealContract[]>(directUrl, cacheKey);
    return Array.isArray(contracts) ? contracts : [];
  } catch (err) {
    console.error('Error al consultar contratos por entidad:', err);
    return [];
  }
}

export function mapRealContractToContract(rc: RealContract): Contract {
  // Soporta tanto valor_del_contrato como valor_contrato
  const baseValue = Number(rc.valor_del_contrato) || Number(rc.valor_contrato) || 0;
  const totalValue = Number(rc.valor_total_con_adiciones) || baseValue;

  // Cálculo de adición presupuestal real
  const moneyAdditionPercentage =
    baseValue > 0 && totalValue > baseValue
      ? Math.round(((totalValue - baseValue) / baseValue) * 100)
      : 0;

  // Cálculo de prórroga temporal real
  const duration = Number(rc.duraci_n_del_contrato) || Number(rc.duracion) || 0;
  const daysAdded = Number(rc.dias_adicionados) || 0;
  const timeAdditionPercentage =
    duration > 0 && daysAdded > 0 ? Math.round((daysAdded / duration) * 100) : 0;

  const numberOfBidders =
    Number(rc.numero_de_ofertas_recibidas || rc.ofertas_recibidas) || 0;

  const startDate =
    rc.fecha_de_inicio_del_contrato || rc.fecha_inicio_ejecucion || rc.fecha_de_firma || '';
  const endDate = rc.fecha_de_fin_del_contrato || rc.fecha_fin_ejecucion || '';

  const executionPct = calculateExecutionPercentage(rc, startDate, endDate);
  const status = calculateStatus(
    rc,
    executionPct,
    moneyAdditionPercentage,
    timeAdditionPercentage,
    endDate,
  );

  const processUrl = extractProcessUrl(rc);
  const departmentAgency = extractSecretariaOrDespacho(rc);
  const cleanSpendingOfficer =
    rc.nombre_ordenador_del_gasto && rc.nombre_ordenador_del_gasto !== 'No definido'
      ? rc.nombre_ordenador_del_gasto
      : undefined;
  const cleanSupervisor =
    rc.nombre_supervisor && rc.nombre_supervisor !== 'No definido'
      ? rc.nombre_supervisor
      : undefined;

  const rawName = (rc.objeto_del_contrato || '').trim();
  const rawDesc = (rc.descripcion_del_proceso || '').trim();
  const cleanName =
    rawName && rawName.toLowerCase() !== 'no definido'
      ? rawName
      : (rawDesc && rawDesc.toLowerCase() !== 'no definido'
        ? rawDesc
        : (rawName || rawDesc || 'Sin descripción'));

  return {
    id: rc.id_contrato || rc.referencia_del_contrato || 'N/A',
    name: cleanName,
    municipalityCode: '',
    contractor: rc.proveedor_adjudicado || 'No adjudicado',
    value: totalValue > 0 ? totalValue : baseValue,
    startDate,
    endDate,
    executionPercentage: executionPct,
    timeAdditionPercentage,
    moneyAdditionPercentage,
    procurementMethod: normalizeModalidad(rc.modalidad_de_contratacion),
    numberOfBidders,
    category: rc.tipo_de_contrato || rc.sector || 'General',
    status: status as import('../utils/types').SemaphoreStatus,
    type: 'contract' as const,
    // Campos oficiales enriquecidos del expediente y dependencia
    entityName: rc.nombre_entidad,
    entityNit: rc.nit_entidad,
    departmentAgency,
    spendingOfficer: cleanSpendingOfficer,
    supervisor: cleanSupervisor,
    processNumber: rc.proceso_de_compra || rc.referencia_del_contrato,
    processUrl,
    justification: rc.justificacion_modalidad_de,
    fundingSource: rc.origen_de_los_recursos,
    expenseDestination: rc.destino_gasto,
    sector: rc.sector,
    branch: rc.rama,
    rawRealContract: rc,
  };
}

export function extractSecretariaOrDespacho(rc: RealContract): string {
  // 1. Si viene especificado en la unidad ejecutora de SECOP II
  if (rc.nombre_de_la_unidad_de && typeof rc.nombre_de_la_unidad_de === 'string' && rc.nombre_de_la_unidad_de.trim()) {
    return rc.nombre_de_la_unidad_de.trim();
  }

  // 2. Extracción heurística contextual a partir del objeto y descripción contractual
  const text = `${rc.objeto_del_contrato || ''} ${rc.descripcion_del_proceso || ''}`;
  const patterns = [
    /(secretar[ií]a\s+(?:general|de\s+[a-záéíóúñ\s]+?))(?:,|\.|\s+del|\s+para|\s+de\s+la|\s+de\s+los|\s+con\s+el|\s+en\s+el|\s+a\s+través|$)/i,
    /(despacho\s+del?\s+[a-záéíóúñ\s]+?)(?:,|\.|\s+del|\s+para|\s+de\s+la|\s+a\s+través|$)/i,
    /(direcci[oó]n\s+(?:general|de\s+[a-záéíóúñ\s]+?))(?:,|\.|\s+del|\s+para|\s+de\s+la|$)/i,
    /(instituto\s+(?:municipal|distrital|de\s+[a-záéíóúñ\s]+?))(?:,|\.|\s+del|\s+para|\s+de\s+la|$)/i,
    /(departamento\s+administrativo\s+de\s+[a-záéíóúñ\s]+?)(?:,|\.|\s+del|\s+para|$)/i,
    /(unidad\s+administrativa\s+(?:especial\s+)?de\s+[a-záéíóúñ\s]+?)(?:,|\.|\s+del|\s+para|$)/i,
    /(oficina\s+(?:asesora\s+)?de\s+[a-záéíóúñ\s]+?)(?:,|\.|\s+del|\s+para|$)/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const cleaned = match[1].trim().replace(/[\s\r\n]+/g, ' ');
      if (cleaned.length >= 10 && cleaned.length <= 80) {
        return cleaned
          .toLowerCase()
          .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
      }
    }
  }

  // 3. Fallback inteligente a sector administrativo
  if (rc.sector && rc.sector !== 'No aplica/No pertenece' && rc.sector !== 'Servicio Público') {
    return `Área de ${rc.sector}`;
  }

  return rc.nombre_entidad ? `${rc.nombre_entidad} - Despacho Central` : 'Despacho Central de Contratación';
}

function extractProcessUrl(rc: RealContract): string | undefined {
  if (!rc.urlproceso) return undefined;
  if (typeof rc.urlproceso === 'string') return rc.urlproceso;
  if (typeof rc.urlproceso === 'object' && (rc.urlproceso as any).url) {
    return (rc.urlproceso as any).url;
  }
  return undefined;
}

function calculateExecutionPercentage(rc: RealContract, startDate: string, endDate: string): number {
  const estado = (rc.estado_contrato || '').toLowerCase();
  if (estado.includes('liquidado') || estado.includes('terminado') || estado.includes('cerrado')) {
    return 100;
  }
  if (estado.includes('cancelado') || estado.includes('retiro') || estado.includes('rescindido')) {
    return 0;
  }

  // Cálculo temporal de avance
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();

    if (!isNaN(start) && !isNaN(end) && end > start) {
      if (now >= end) {
        return 100;
      }
      const elapsed = Math.round(((now - start) / (end - start)) * 100);
      return Math.min(99, Math.max(5, elapsed));
    }
  }

  if (estado.includes('ejecución') || estado.includes('ejecucion')) return 65;
  if (estado.includes('adjudicado') || estado.includes('firma')) return 30;
  if (estado.includes('celebrado')) return 85;
  if (estado.includes('publicado') || estado.includes('evaluación')) return 10;
  return 30;
}

function calculateStatus(
  rc: RealContract,
  executionPct: number,
  moneyAdditionPct: number,
  timeAdditionPct: number,
  endDate: string,
): string {
  const estado = (rc.estado_contrato || '').toLowerCase();

  if (estado.includes('cancelado') || estado.includes('retiro')) return 'Rojo';

  // Alerta Contrato Avispa (>50% de adición)
  if (moneyAdditionPct > 50 || timeAdditionPct > 50) return 'Rojo';

  // Alerta de contrato vencido que sigue activo
  if (endDate) {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    if (!isNaN(end) && end < now && (estado.includes('ejecución') || estado.includes('ejecucion'))) {
      return 'Rojo';
    }
  }

  if (executionPct < 30) return 'Rojo';
  if (executionPct <= 60) return 'Amarillo';
  return 'Verde';
}
