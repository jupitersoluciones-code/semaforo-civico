export enum SemaphoreStatus {
  Green = 'Verde',
  Yellow = 'Amarillo',
  Red = 'Rojo',
  Unknown = 'Desconocido',
}

export interface Department {
  code: string;
  name: string;
}

export interface Municipality {
  code: string;
  name: string;
  departmentCode: string;
  category?: string;
  budget?: number;
}

interface ProjectBase {
  id: string;
  name: string;
  municipalityCode: string;
  executionPercentage: number;
  status: SemaphoreStatus;
}

export interface Contract extends ProjectBase {
  type: 'contract';
  contractor: string;
  value: number;
  startDate: string;
  endDate: string;
  timeAdditionPercentage: number;
  moneyAdditionPercentage: number;
  hasItemsToCompare?: boolean;
  procurementMethod:
    | 'Licitación Pública'
    | 'Contratación Directa'
    | 'Mínima Cuantía'
    | 'Selección Abreviada';
  numberOfBidders: number;
  category: string;
  relatedGoalId?: string;
  // Campos enriquecidos del expediente y dependencia oficial
  entityName?: string;
  entityNit?: string;
  departmentAgency?: string;
  spendingOfficer?: string;
  supervisor?: string;
  processNumber?: string;
  processUrl?: string;
  justification?: string;
  fundingSource?: string;
  expenseDestination?: string;
  sector?: string;
  branch?: string;
  rawRealContract?: RealContract;
}

export interface Goal extends ProjectBase {
  type: 'goal';
  pdtObjective: string;
  responsibleEntity: string;
  budget: number;
  budgetExecutionPercentage: number;
}

export type Project = Contract | Goal;

export interface SecopContract {
  id: string;
  municipalityCode: string;
  entity: string;
  object: string;
  value: number;
  status: 'Publicado' | 'En Evaluación' | 'Adjudicado' | 'Celebrado';
  publicationDate: string;
  url: string;
}

export interface MarketPriceItem {
  id: string;
  name: string;
  unit: 'Unidad' | 'Bulto' | 'Metro Cúbico' | 'Hora' | 'Global';
  averagePrice: number;
}

export interface ContractItem {
  contractId: string;
  marketItemId: string;
  quantity: number;
  unitPrice: number;
}

export interface MinorContract {
  id: string;
  municipalityCode: string;
  contractorName: string;
  contractorNit: string;
  contractorAddress: string;
  contractorPhone: string;
  value: number;
  object: string;
}

export interface InteradministrativeContract {
  id: string;
  municipalityCode: string;
  contractorName: string;
  contractorNit: string;
  contractorAddress: string;
  contractorPhone: string;
  value: number;
  object: string;
  startDate: string;
  endDate: string;
}

export interface HousingContract {
  id: string;
  municipalityCode: string;
  object: string;
  value: number;
  contractorName: string;
  contractorNit: string;
  beneficiaries: number;
  subsidyType: 'Mejoramiento' | 'Adquisición Nueva' | 'Construcción en Sitio Propio';
  address: string;
}

export interface LegalThresholds {
  municipalityCategory: string;
  municipalityBudgetSMMLV: number;
  menorCuantiaLimit: number;
  minimaCuantiaLimit: number;
  smmlvValue: number;
}

export interface ProcurementStats {
  direct: number;
  public: number;
  total: number;
  directPercentage: number;
  legalThresholds: LegalThresholds;
  anomaliesDetected: string[];
}

export interface ComparisonItem extends ContractItem {
  marketPrice: MarketPriceItem;
}

// Real contract from datos.gov.co (SECOP II)
// Only includes fields we actually use — full schema has 85+ columns
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RealContract = Record<string, any> & {
  id_contrato?: string;
  nombre_entidad?: string;
  nit_entidad?: string;
  departamento?: string;
  ciudad?: string;
  estado_contrato?: string;
  modalidad_de_contratacion?: string;
  tipo_de_contrato?: string;
  objeto_del_contrato?: string;
  descripcion_del_proceso?: string;
  proveedor_adjudicado?: string;
  valor_contrato?: number | string;
  fecha_de_firma?: string;
  fecha_inicio_ejecucion?: string;
  fecha_fin_ejecucion?: string;
  duracion?: number;
  causa_retiro?: string;
  modelo_de_contratacion?: string;
  url_proceso?: string;
  proceso_de_compra?: string;
  referencia_del_contrato?: string;
  sector?: string;
  estado_del_proceso?: string;
}

// Aggregated stats from cerocorrupcion.pro
export interface CeroCorrupcionStats {
  totalContratos: number;
  valorTotal: number;
  topEntidades: Array<{ entidad: string; total: number; valor: number }>;
  porEstado: Record<string, number>;
  porModalidad: Record<string, number>;
  porDepartamento: Record<string, number>;
}
