import { fetchWithCache, fetchJson } from './apiClient';
import type { RealContract, Contract, Department, Municipality } from '../utils/types';
import { DEPARTMENTS, MUNICIPALITIES } from '../utils/constants';

const SOCRATA_BASE_URL = 'https://www.datos.gov.co/resource';
const SECOP_CONTRACTS_ID = 'jbjy-vk9h';
const SECOP_PROCESSES_ID = 'p6dx-8zbt';

export async function fetchDepartments(): Promise<Department[]> {
  return new Promise((resolve) => setTimeout(() => resolve(DEPARTMENTS), 30));
}

export async function fetchMunicipalitiesByDepartment(departmentCode: string): Promise<Municipality[]> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          MUNICIPALITIES.filter((m) => m.departmentCode === departmentCode).sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        ),
      30,
    ),
  );
}

function getDeptInfo(code: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.code === code);
}

function getMunInfo(code: string): Municipality | undefined {
  return MUNICIPALITIES.find((m) => m.code === code);
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

function buildSoqlWhereClause(deptName: string, cityName?: string): string {
  const deptUpper = deptName.toUpperCase().replace(/'/g, "''");
  const deptNoAccents = stripAccents(deptUpper);

  let clause = `(upper(departamento)='${deptUpper}' OR upper(departamento)='${deptNoAccents}')`;

  if (cityName && cityName.trim()) {
    const cityUpper = cityName.toUpperCase().replace(/'/g, "''");
    const cityNoAccents = stripAccents(cityUpper);
    clause += ` AND (upper(ciudad)='${cityUpper}' OR upper(ciudad)='${cityNoAccents}')`;
  }

  return clause;
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

  const cacheKey = `contracts_${municipalityCode}_${limit}`;
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
    return Array.isArray(contracts) ? contracts : [];
  } catch (error) {
    console.warn('Fallo consulta con ciudad específica, intentando por departamento:', error);
    // Fallback terciario: si la ciudad no arroja por disparidad de nombre municipal en SECOP II, consultar por departamento
    const fallbackParams = new URLSearchParams({
      $where: `upper(departamento)='${deptName.toUpperCase()}'`,
      $order: 'fecha_de_firma DESC',
      $limit: String(limit),
    });
    try {
      return await fetchJson<RealContract[]>(
        `${SOCRATA_BASE_URL}/${SECOP_CONTRACTS_ID}.json?${fallbackParams.toString()}`,
      );
    } catch {
      return [];
    }
  }
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
  const whereClause = buildSoqlWhereClause(deptName, cityName);

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
    $order: 'fecha_de_firma DESC',
    $limit: String(limit),
  });

  const url = `${SOCRATA_BASE_URL}/${SECOP_PROCESSES_ID}.json?${params.toString()}`;

  try {
    return await fetchWithCache<RealContract[]>(url, cacheKey);
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

  return {
    id: rc.id_contrato || rc.referencia_del_contrato || 'N/A',
    name: rc.objeto_del_contrato || rc.descripcion_del_proceso || 'Sin descripción',
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
