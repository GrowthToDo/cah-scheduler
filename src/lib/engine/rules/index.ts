import type { RuleEvaluator } from "./types";
import { minStaffRule } from "./min-staff";
import { chargeNurseRule } from "./charge-nurse";
import { patientRatioRule } from "./patient-ratio";
import { restHoursRule } from "./rest-hours";
import { maxConsecutiveRule } from "./max-consecutive";
import { icuCompetencyRule } from "./icu-competency";
import { overtimeCostRule } from "./overtime-cost";
import { preferenceMatchRule } from "./preference-match";
import { weekendFairnessRule } from "./weekend-fairness";
import { skillMixRule } from "./skill-mix";

const evaluatorRegistry: Map<string, RuleEvaluator> = new Map();

// Register all built-in rules
[
  minStaffRule,
  chargeNurseRule,
  patientRatioRule,
  restHoursRule,
  maxConsecutiveRule,
  icuCompetencyRule,
  overtimeCostRule,
  preferenceMatchRule,
  weekendFairnessRule,
  skillMixRule,
].forEach((rule) => {
  evaluatorRegistry.set(rule.id, rule);
});

export function getEvaluator(id: string): RuleEvaluator | undefined {
  return evaluatorRegistry.get(id);
}

export function getAllEvaluators(): RuleEvaluator[] {
  return [...evaluatorRegistry.values()];
}
