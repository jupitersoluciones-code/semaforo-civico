import type { RealContract } from '../utils/types';

export interface CompanyRiskProfile {
  contractorName: string;
  nit?: string;
  totalContracts: number;
  totalValue: number;
  averageValue: number;
  directAwardsCount: number;
  directPercentage: number;
  singleEntityDependencyPct: number;
  topContractingEntity: string;
  avispaContractsCount: number;
  shellCompanyScore: number; // 0 - 100
  riskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico (Indicio Empresa de Papel)';
  redFlags: string[];
  recommendations: string[];
  contracts: RealContract[];
}

export interface EntityRiskProfile {
  entityName: string;
  totalContracts: number;
  totalValue: number;
  directPercentage: number;
  topContractors: Array<{ name: string; count: number; value: number; percentage: number }>;
  avispaContractsCount: number;
  integrityScore: number; // 0 - 100 (100 = máxima transparencia)
  riskLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
  redFlags: string[];
  contracts: RealContract[];
}

/**
 * Evalúa a un contratista o empresa licitante para detectar patrones de empresa de papel (shell company)
 * o concentración anómala de contratación estatal.
 */
export function evaluateContractorRisk(
  contractorName: string,
  contracts: RealContract[],
): CompanyRiskProfile {
  const filtered = contracts.filter(
    (c) =>
      c.proveedor_adjudicado &&
      c.proveedor_adjudicado.toLowerCase().includes(contractorName.toLowerCase().trim()),
  );

  const totalContracts = filtered.length;
  if (totalContracts === 0) {
    return {
      contractorName,
      totalContracts: 0,
      totalValue: 0,
      averageValue: 0,
      directAwardsCount: 0,
      directPercentage: 0,
      singleEntityDependencyPct: 0,
      topContractingEntity: 'N/A',
      avispaContractsCount: 0,
      shellCompanyScore: 0,
      riskLevel: 'Bajo',
      redFlags: ['No se registraron contratos en la muestra analizada.'],
      recommendations: ['Verificar el nombre exacto o NIT en el Registro Único de Proponentes (RUP).'],
      contracts: [],
    };
  }

  const totalValue = filtered.reduce(
    (sum, c) => sum + (Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0),
    0,
  );
  const averageValue = totalContracts > 0 ? totalValue / totalContracts : 0;

  // 1. Contratación Directa
  const directContracts = filtered.filter((c) =>
    (c.modalidad_de_contratacion || '').toLowerCase().includes('directa'),
  );
  const directPercentage = (directContracts.length / totalContracts) * 100;

  // 2. Monodependencia (Captura Institucional)
  const entityCount: Record<string, { count: number; value: number }> = {};
  filtered.forEach((c) => {
    const ent = c.nombre_entidad || 'Entidad no especificada';
    if (!entityCount[ent]) entityCount[ent] = { count: 0, value: 0 };
    entityCount[ent].count += 1;
    entityCount[ent].value += Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0;
  });

  const sortedEntities = Object.entries(entityCount).sort((a, b) => b[1].value - a[1].value);
  const topEntityName = sortedEntities[0]?.[0] || 'N/A';
  const topEntityValue = sortedEntities[0]?.[1]?.value || 0;
  const singleEntityDependencyPct = totalValue > 0 ? (topEntityValue / totalValue) * 100 : 0;

  // 3. Contratos Avispa (adición presupuestal > 50%)
  const avispaContracts = filtered.filter((c) => {
    const val = Number(c.valor_contrato) || 0;
    const conAdic = Number(c.valor_total_con_adiciones) || 0;
    return val > 0 && conAdic > val * 1.5;
  });

  // 4. Objeto camaleónico (múltiples sectores no afines)
  const objects = filtered.map((c) => (c.objeto_del_contrato || '').toLowerCase());
  const hasAlimentos = objects.some((o) => o.includes('alimento') || o.includes('pae') || o.includes('refrigerio') || o.includes('viveres'));
  const hasObras = objects.some((o) => o.includes('obra') || o.includes('pavimento') || o.includes('vial') || o.includes('construccion'));
  const hasSoftware = objects.some((o) => o.includes('software') || o.includes('computo') || o.includes('tecnolog') || o.includes('licencia'));
  const isChameleonic = [hasAlimentos, hasObras, hasSoftware].filter(Boolean).length >= 2;

  // 5. Cálculo del Score de Riesgo Forense (0 - 100)
  let score = 0;
  const redFlags: string[] = [];

  if (directPercentage >= 70 && totalContracts >= 2) {
    score += 25;
    redFlags.push(`Alta tasa de contratación a dedo (${directPercentage.toFixed(0)}% por contratación directa sin puja competitiva).`);
  } else if (directPercentage >= 40) {
    score += 10;
  }

  if (singleEntityDependencyPct >= 75 && totalContracts >= 2) {
    score += 30;
    redFlags.push(
      `Monodependencia severa del ${singleEntityDependencyPct.toFixed(0)}% concentrada exclusivamente con "${topEntityName}".`,
    );
  } else if (singleEntityDependencyPct >= 50 && totalContracts >= 3) {
    score += 15;
    redFlags.push(`Dependencia institucional del ${singleEntityDependencyPct.toFixed(0)}% con "${topEntityName}".`);
  }

  if (avispaContracts.length > 0) {
    score += Math.min(30, avispaContracts.length * 15);
    redFlags.push(
      `Reincidencia en ${avispaContracts.length} Contrato(s) Avispa con adición de valor superior al 50% del tope legal.`,
    );
  }

  if (isChameleonic) {
    score += 20;
    redFlags.push(
      'Patrón de "Objeto Camaleónico": la empresa ejecuta simultáneamente obras civiles, alimentos y tecnología, indicio típico de consorcio de papel.',
    );
  }

  score = Math.min(100, Math.max(0, score));

  let riskLevel: CompanyRiskProfile['riskLevel'] = 'Bajo';
  if (score >= 70) {
    riskLevel = 'Crítico (Indicio Empresa de Papel)';
  } else if (score >= 45) {
    riskLevel = 'Alto';
  } else if (score >= 20) {
    riskLevel = 'Moderado';
  }

  const recommendations: string[] = [];
  if (score >= 45) {
    recommendations.push('Requerir certificado de existencia y representación legal con fecha de constitución en Cámara de Comercio.');
    recommendations.push('Verificar domicilio físico comercial mediante visita de veeduría (descartar bodegas vacías o residencias ficticias).');
    recommendations.push('Cotejar capacidad financiera Kresidual y nómina de empleados en PILA.');
  } else {
    recommendations.push('Monitorear el cumplimiento de plazos y no autorizar adiciones que superen el 20% del valor pactado.');
  }

  return {
    contractorName,
    nit: filtered[0]?.nit_entidad || undefined,
    totalContracts,
    totalValue,
    averageValue,
    directAwardsCount: directContracts.length,
    directPercentage,
    singleEntityDependencyPct,
    topContractingEntity: topEntityName,
    avispaContractsCount: avispaContracts.length,
    shellCompanyScore: score,
    riskLevel,
    redFlags,
    recommendations,
    contracts: filtered,
  };
}

/**
 * Evalúa a una entidad pública compradora (Ordenador del Gasto) para medir su índice de integridad
 * y posibles síntomas de concentración contractual o favoritismo.
 */
export function evaluateEntityRisk(
  entityName: string,
  contracts: RealContract[],
): EntityRiskProfile {
  const filtered = contracts.filter(
    (c) =>
      c.nombre_entidad &&
      c.nombre_entidad.toLowerCase().includes(entityName.toLowerCase().trim()),
  );

  const totalContracts = filtered.length;
  if (totalContracts === 0) {
    return {
      entityName,
      totalContracts: 0,
      totalValue: 0,
      directPercentage: 0,
      topContractors: [],
      avispaContractsCount: 0,
      integrityScore: 100,
      riskLevel: 'Bajo',
      redFlags: ['Sin contratos registrados en la muestra consultada.'],
      contracts: [],
    };
  }

  const totalValue = filtered.reduce(
    (sum, c) => sum + (Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0),
    0,
  );

  const directContracts = filtered.filter((c) =>
    (c.modalidad_de_contratacion || '').toLowerCase().includes('directa'),
  );
  const directPercentage = (directContracts.length / totalContracts) * 100;

  // Concentración en top contratistas
  const contractorTotals: Record<string, { count: number; value: number }> = {};
  filtered.forEach((c) => {
    const prov = c.proveedor_adjudicado || 'Sin adjudicar';
    if (!contractorTotals[prov]) contractorTotals[prov] = { count: 0, value: 0 };
    contractorTotals[prov].count += 1;
    contractorTotals[prov].value += Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0;
  });

  const topContractors = Object.entries(contractorTotals)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }));

  const avispaContracts = filtered.filter((c) => {
    const val = Number(c.valor_contrato) || 0;
    const conAdic = Number(c.valor_total_con_adiciones) || 0;
    return val > 0 && conAdic > val * 1.5;
  });

  // Cálculo de índice de integridad (100 = perfecto, baja con malas prácticas)
  let integrity = 100;
  const redFlags: string[] = [];

  if (directPercentage >= 60) {
    integrity -= 30;
    redFlags.push(`Abuso de Contratación Directa: el ${directPercentage.toFixed(0)}% de los procesos se asignan a dedo sin licitación.`);
  } else if (directPercentage >= 35) {
    integrity -= 15;
    redFlags.push(`Contratación directa elevada (${directPercentage.toFixed(0)}%).`);
  }

  const top1Pct = topContractors[0]?.percentage || 0;
  if (top1Pct > 30 && totalContracts >= 5) {
    integrity -= 25;
    redFlags.push(
      `Alta concentración: El contratista "${topContractors[0].name}" acapara el ${top1Pct.toFixed(0)}% de todo el presupuesto auditado.`,
    );
  }

  if (avispaContracts.length > 0) {
    integrity -= Math.min(25, avispaContracts.length * 10);
    redFlags.push(`${avispaContracts.length} contratos con sobrecostos y adiciones desproporcionadas (>50%).`);
  }

  integrity = Math.max(5, Math.min(100, integrity));

  let riskLevel: EntityRiskProfile['riskLevel'] = 'Bajo';
  if (integrity < 40) riskLevel = 'Crítico';
  else if (integrity < 65) riskLevel = 'Alto';
  else if (integrity < 85) riskLevel = 'Moderado';

  return {
    entityName,
    totalContracts,
    totalValue,
    directPercentage,
    topContractors,
    avispaContractsCount: avispaContracts.length,
    integrityScore: integrity,
    riskLevel,
    redFlags,
    contracts: filtered,
  };
}
