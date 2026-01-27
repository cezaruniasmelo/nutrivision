
export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Feminino',
  OTHER = 'Outro'
}

export type ClinicalGoal = 'weight_loss' | 'hypertrophy' | 'longevity' | 'performance';

export interface ScanSession {
  // Upper Body (Torso/Head) - Primary
  frontLandmarks: any[] | null;
  sideLandmarks: any[] | null;
  backLandmarks: any[] | null;
  
  // Lower Body (Legs) - Secondary
  frontLegsLandmarks?: any[] | null;
  sideLegsLandmarks?: any[] | null;
  backLegsLandmarks?: any[] | null;

  timestamp: number;
}

export interface PatientData {
  id?: string; // New: Unique ID for selection
  lastVisit?: string; // New: Date string
  photoURL?: string; // New: URL da foto do paciente
  
  // Personal Info
  name: string;
  age: number;
  gender: Gender;
  
  // Clinical Metrics (Inputs Manuais/Upload)
  weight: number; // in kg
  height: number; // in cm
  glucose?: number;
  cholesterol?: number;
  bioimpedanceBF?: number; // Body Fat from bioimpedance scale if available
  
  // Qualitative
  clinicalGoal: ClinicalGoal;
  patientSentiment?: string;
  
  // Capture Data (Vision AI)
  scanSession?: ScanSession;
}

export interface ProcessingStats {
  fps: number;
  inferenceTime: number;
}

// Estruturas do Motor de Predição
export interface SimulationPoint {
  month: number;
  weight: number;
}

export interface Scenario {
  id: 'inertia' | 'partial' | 'total';
  name: string;
  adherence_level: string; // "0%", "60%", "100%"
  description: string;
  projected_weight_1yr: number;
  projected_bf_1yr: number; // Body Fat %
  health_outcome: string; // Texto curto de previsão
  curve_data: SimulationPoint[]; // Pontos para o gráfico (0, 3, 6, 12, 24 meses)
}

export interface MetabolicSimulation {
  basal_metabolic_rate: number; // TMB Calculada
  maintenance_calories: number; // TMB * Fator Atividade
  scenarios: Scenario[];
}

export interface DataComparison {
  metric: string;
  source_exam: string | number;
  source_vision: string | number;
  correlation: 'high' | 'medium' | 'low';
  insight: string;
}

export interface ReportData {
  analise_fisiologica: string;
  riscos_identificados: string[];
  plano_sugerido: string;
  referencias_grounding: string[];
  comparativo_dados: DataComparison[]; // Novo campo de comparação
  metabolic_simulation: MetabolicSimulation;
}

// Controle de Navegação do App
// 'patient_select' added
export type AppView = 'patient_select' | 'dashboard' | 'register' | 'scan' | 'simulation';

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'scan' | 'lab' | 'bioimpedance';
  summary: string;
}