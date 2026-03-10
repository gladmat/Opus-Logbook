// Types for the 500-case test harness

export interface HarnessConfig {
  baseUrl: string;
  email: string;
  password: string;
  batchSize: number;
  delayMs: number;
}

export interface TestResult {
  caseNumber: number;
  category: string;
  scenarioName: string;
  status: "PASS" | "FAIL" | "ERROR";
  httpStatus?: number;
  errorMessage?: string;
  procedureId?: string;
  flapCount?: number;
  anastomosisCount?: number;
  responseTimeMs: number;
}

export interface CaseDefinition {
  caseId: string; // e.g. "H001", "SC034"
  scenario: string;
  specialty: string;
  procedureDisplayName: string;
  procedureSnomedCode?: string;
  laterality?: string;
  urgency?: string;
  asaScore?: number;
  bmi?: number;
  smoker?: boolean;
  diabetes?: string;
  stayType?: string;
  caseProcedures: NestedCaseProcedureInput[];
  flaps?: NestedFlapInput[];
}

export interface NestedCaseProcedureInput {
  sequenceOrder: number;
  procedureName: string;
  specialty?: string;
  snomedCtCode?: string;
  snomedCtDisplay?: string;
  surgeonRole?: string;
  clinicalDetails?: string;
  notes?: string;
}

export interface NestedFlapInput {
  flapDisplayName: string;
  flapSnomedCode?: string;
  flapCommonName?: string;
  side?: string;
  composition?: string;
  harvestTechnique?: string;
  recipientSite?: string;
  recipientSiteRegion?: string;
  flapWidthCm?: string;
  flapLengthCm?: string;
  perforatorCount?: number;
  elevationPlane?: string;
  ischemiaTimeMinutes?: number;
  anastomoses?: NestedAnastomosisInput[];
}

export interface NestedAnastomosisInput {
  vesselType: string;
  recipientVesselName: string;
  recipientVesselSnomedCode?: string;
  donorVesselName?: string;
  donorVesselSnomedCode?: string;
  couplingMethod?: string;
  couplerSizeMm?: string;
  configuration?: string;
  sutureType?: string;
  sutureSize?: string;
  patencyConfirmed?: boolean;
}

export interface AuditReport {
  totalAttempted: number;
  passed: number;
  failed: number;
  errors: number;
  successRate: number;
  meanResponseMs: number;
  p95ResponseMs: number;
  casesWithFlaps: number;
  casesWithAnastomoses: number;
  perCategory: CategoryBreakdown[];
  failures: TestResult[];
  durationSeconds: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  pass: number;
  fail: number;
  error: number;
  successRate: number;
  avgMs: number;
}
