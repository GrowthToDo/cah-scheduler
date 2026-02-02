export type RuleType = "hard" | "soft";
export type RuleCategory = "staffing" | "rest" | "fairness" | "cost" | "skill" | "preference";

export interface Rule {
  id: string;
  name: string;
  ruleType: RuleType;
  category: RuleCategory;
  description: string | null;
  parameters: Record<string, unknown>;
  weight: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CensusBand {
  id: string;
  name: string;
  unit: string;
  minPatients: number;
  maxPatients: number;
  requiredRNs: number;
  requiredCNAs: number;
  requiredChargeNurses: number;
  patientToNurseRatio: string;
  isActive: boolean;
  createdAt: string;
}
