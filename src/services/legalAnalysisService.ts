import type { LegalThresholds, RealContract } from '../utils/types';

// SMMLV de referencia para contratación pública en Colombia
const SMMLV_2024 = 1_300_000;

// Presupuestos y categorías oficiales de los principales municipios de Colombia
const MUNICIPALITY_FINANCIALS: Record<string, { category: string; annualBudget: number }> = {
  '05001': { category: 'Especial', annualBudget: 8_500_000_000_000 }, // Medellín
  '11001': { category: 'Especial', annualBudget: 33_000_000_000_000 }, // Bogotá
  '76001': { category: 'Especial', annualBudget: 5_500_000_000_000 }, // Cali
  '08001': { category: 'Especial', annualBudget: 4_200_000_000_000 }, // Barranquilla
  '13001': { category: 'Especial', annualBudget: 2_800_000_000_000 }, // Cartagena
  '68001': { category: 'Especial', annualBudget: 3_100_000_000_000 }, // Bucaramanga
  '05266': { category: '1', annualBudget: 600_000_000_000 }, // Envigado
  '76109': { category: '1', annualBudget: 800_000_000_000 }, // Buenaventura
  '54001': { category: '1', annualBudget: 1_200_000_000_000 }, // Cúcuta
  '66001': { category: '1', annualBudget: 1_100_000_000_000 }, // Pereira
  '17001': { category: '2', annualBudget: 450_000_000_000 }, // Manizales
  '73001': { category: '2', annualBudget: 380_000_000_000 }, // Ibagué
  '41001': { category: '2', annualBudget: 420_000_000_000 }, // Neiva
  '63001': { category: '2', annualBudget: 410_000_000_000 }, // Armenia
  '50001': { category: '2', annualBudget: 650_000_000_000 }, // Villavicencio
  '20001': { category: '2', annualBudget: 550_000_000_000 }, // Valledupar
  '15001': { category: '3', annualBudget: 250_000_000_000 }, // Tunja
  '19001': { category: '3', annualBudget: 300_000_000_000 }, // Popayán
  '52001': { category: '3', annualBudget: 280_000_000_000 }, // Pasto
  '23001': { category: '3', annualBudget: 320_000_000_000 }, // Montería
  '47001': { category: '3', annualBudget: 340_000_000_000 }, // Santa Marta
  '70001': { category: '3', annualBudget: 290_000_000_000 }, // Sincelejo
  '44001': { category: '3', annualBudget: 270_000_000_000 }, // Riohacha
  '27001': { category: '4', annualBudget: 180_000_000_000 }, // Quibdó
  '18001': { category: '4', annualBudget: 190_000_000_000 }, // Florencia
  '81001': { category: '4', annualBudget: 170_000_000_000 }, // Arauca
  '85001': { category: '4', annualBudget: 210_000_000_000 }, // Yopal
  '86001': { category: '5', annualBudget: 110_000_000_000 }, // Mocoa
  '88001': { category: '4', annualBudget: 160_000_000_000 }, // San Andrés
  '91001': { category: '6', annualBudget: 60_000_000_000 }, // Leticia
  '95001': { category: '6', annualBudget: 50_000_000_000 }, // San José del Guaviare
  '94001': { category: '6', annualBudget: 40_000_000_000 }, // Inírida
  '97001': { category: '6', annualBudget: 35_000_000_000 }, // Mitú
  '99001': { category: '6', annualBudget: 35_000_000_000 }, // Puerto Carreño
};

export function getLegalThresholds(municipalityCode: string): LegalThresholds {
  const financials = MUNICIPALITY_FINANCIALS[municipalityCode] || {
    category: '6',
    annualBudget: 45_000_000_000,
  };

  const budgetInSMMLV = financials.annualBudget / SMMLV_2024;
  
  // Tabla legal de menor cuantía según el literal b del numeral 2 del artículo 2 de la Ley 1150 de 2007
  let menorCuantiaSMMLV = 280;

  if (budgetInSMMLV >= 1_200_000) {
    menorCuantiaSMMLV = 1000;
  } else if (budgetInSMMLV >= 850_000) {
    menorCuantiaSMMLV = 850;
  } else if (budgetInSMMLV >= 400_000) {
    menorCuantiaSMMLV = 650;
  } else if (budgetInSMMLV >= 120_000) {
    menorCuantiaSMMLV = 450;
  }

  const menorCuantiaLimit = menorCuantiaSMMLV * SMMLV_2024;
  const minimaCuantiaLimit = menorCuantiaLimit * 0.1;

  return {
    municipalityCategory: financials.category,
    municipalityBudgetSMMLV: Math.round(budgetInSMMLV),
    menorCuantiaLimit,
    minimaCuantiaLimit,
    smmlvValue: SMMLV_2024,
  };
}

export function detectAnomalies(
  contracts: RealContract[],
  municipalityCode: string,
): string[] {
  const anomalies: string[] = [];
  const thresholds = getLegalThresholds(municipalityCode);

  const contractorCounts: Record<string, { count: number; totalValue: number; contracts: string[] }> = {};

  contracts.forEach((c) => {
    const modalidad = (c.modalidad_de_contratacion || '').toLowerCase();
    const valor = Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0;
    const proveedor = c.proveedor_adjudicado || '';

    // Alerta 1: Contrato directo que supera el tope de menor cuantía
    if (modalidad.includes('directa') && valor > thresholds.menorCuantiaLimit) {
      anomalies.push(
        `Contrato directo ${c.id_contrato || c.referencia_del_contrato} excede tope de Menor Cuantía (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(thresholds.menorCuantiaLimit)})`,
      );
    }

    // Alerta 2: Contrato de mínima cuantía que supera su límite legal
    if (modalidad.includes('mínima') || modalidad.includes('minima')) {
      if (valor > thresholds.minimaCuantiaLimit) {
        anomalies.push(
          `Contrato mínima cuantía ${c.id_contrato} excede el límite legal (${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(thresholds.minimaCuantiaLimit)})`,
        );
      }
    }

    // Alerta 3: Detección de Contratos Avispa (adiciones presupuestales > 50%)
    const valorAdiciones = Number(c.valor_total_con_adiciones) || 0;
    if (valor > 0 && valorAdiciones > valor * 1.5) {
      const pct = Math.round(((valorAdiciones - valor) / valor) * 100);
      anomalies.push(
        `Contrato ${c.id_contrato || c.referencia_del_contrato} tiene una adición del ${pct}% (Alerta Contrato Avispa, supera el 50% legal)`,
      );
    }

    if (proveedor && proveedor !== 'No adjudicado') {
      if (!contractorCounts[proveedor]) {
        contractorCounts[proveedor] = { count: 0, totalValue: 0, contracts: [] };
      }
      contractorCounts[proveedor].count++;
      contractorCounts[proveedor].totalValue += valor;
      contractorCounts[proveedor].contracts.push(c.id_contrato || '');
    }

    // Alerta 4: Vencimiento de plazo en estado de ejecución
    const fechaFin = new Date(c.fecha_fin_ejecucion || '');
    const now = new Date();
    if (!isNaN(fechaFin.getTime()) && fechaFin < now && (c.estado_contrato || '').toLowerCase().includes('ejecución')) {
      anomalies.push(`Contrato ${c.id_contrato} con fecha de fin vencida (${fechaFin.toISOString().split('T')[0]}) pero permanece en ejecución`);
    }
  });

  // Alerta 5: Concentración desproporcionada de contratación en un solo proveedor
  const totalValue = Object.values(contractorCounts).reduce((sum, c) => sum + c.totalValue, 0);
  Object.entries(contractorCounts).forEach(([proveedor, data]) => {
    if (data.count >= 3 && totalValue > 0) {
      const pct = (data.totalValue / totalValue) * 100;
      if (pct > 30) {
        anomalies.push(
          `Proveedor "${proveedor}" concentra el ${pct.toFixed(1)}% del valor contratado del municipio (${data.count} contratos)`,
        );
      }
    }
  });

  return anomalies;
}

export function detectContractSplitting(
  contracts: RealContract[],
  municipalityCode: string,
): Array<{ contractor: string; contracts: RealContract[]; totalValue: number }> {
  const thresholds = getLegalThresholds(municipalityCode);
  const byContractor: Record<string, RealContract[]> = {};

  // Filtrar contratos con proveedores definidos
  contracts.forEach((c) => {
    const proveedor = c.proveedor_adjudicado;
    if (!proveedor || proveedor === 'No adjudicado') return;
    
    // El fraccionamiento aplica principalmente a contratación directa y mínima cuantía
    const mod = (c.modalidad_de_contratacion || '').toLowerCase();
    const isDirectOrMin = mod.includes('directa') || mod.includes('mínima') || mod.includes('minima') || mod.includes('abreviada');

    if (isDirectOrMin) {
      if (!byContractor[proveedor]) byContractor[proveedor] = [];
      byContractor[proveedor].push(c);
    }
  });

  return Object.entries(byContractor)
    .filter(([, cs]) => cs.length >= 2)
    .map(([contractor, cs]) => {
      // Ordenar por fecha para validar cercanía temporal
      const sorted = [...cs].sort((a, b) => {
        const da = new Date(a.fecha_de_firma || a.fecha_inicio_ejecucion || 0).getTime();
        const db = new Date(b.fecha_de_firma || b.fecha_inicio_ejecucion || 0).getTime();
        return da - db;
      });

      const totalValue = sorted.reduce(
        (sum, c) => sum + (Number(c.valor_contrato) || Number(c.valor_del_contrato) || 0),
        0,
      );

      return {
        contractor,
        contracts: sorted,
        totalValue,
      };
    })
    .filter((item) => item.totalValue > thresholds.minimaCuantiaLimit)
    .sort((a, b) => b.totalValue - a.totalValue);
}
