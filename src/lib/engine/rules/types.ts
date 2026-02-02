export type RuleCategory = "staffing" | "rest" | "fairness" | "cost" | "skill" | "preference";
export type RuleType = "hard" | "soft";

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType;
  shiftId: string;
  staffId?: string;
  description: string;
  penaltyScore?: number;
}

export interface AssignmentInfo {
  id: string;
  shiftId: string;
  staffId: string;
  isChargeNurse: boolean;
  isOvertime: boolean;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

export interface StaffInfo {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  employmentType: string;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  certifications: string[];
  fte: number;
  reliabilityRating: number;
  preferences: {
    preferredShift: string;
    maxHoursPerWeek: number;
    maxConsecutiveDays: number;
    preferredDaysOff: string[];
    avoidWeekends: boolean;
  } | null;
}

export interface ShiftInfo {
  id: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  requiredStaffCount: number;
  requiresChargeNurse: boolean;
  actualCensus: number | null;
}

export interface CensusBandInfo {
  id: string;
  minPatients: number;
  maxPatients: number;
  requiredRNs: number;
  requiredCNAs: number;
  requiredChargeNurses: number;
  patientToNurseRatio: string;
}

export interface RuleContext {
  assignments: AssignmentInfo[];
  staffMap: Map<string, StaffInfo>;
  shiftMap: Map<string, ShiftInfo>;
  censusBands: CensusBandInfo[];
  ruleParameters: Record<string, unknown>;
}

export interface RuleEvaluator {
  id: string;
  name: string;
  type: RuleType;
  category: RuleCategory;
  evaluate: (context: RuleContext) => RuleViolation[];
}

export interface EvaluationResult {
  isValid: boolean;
  hardViolations: RuleViolation[];
  softViolations: RuleViolation[];
  totalPenalty: number;
}
