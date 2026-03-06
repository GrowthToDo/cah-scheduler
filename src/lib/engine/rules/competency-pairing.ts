import type { RuleEvaluator, RuleContext, RuleViolation } from "./types";

/**
 * Level 1 Preceptor Rule (Hard)
 * Level 1 (Novice/Orientee) staff cannot take patients alone.
 * They MUST be paired with a Level 5 (Expert/Preceptor) on the same shift.
 */
export const level1PreceptorRule: RuleEvaluator = {
  id: "level1-preceptor",
  name: "Level 1 Must Have Preceptor",
  type: "hard",
  category: "skill",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // Group assignments by shift
    const shiftAssignments = new Map<string, string[]>();
    for (const a of context.assignments) {
      const existing = shiftAssignments.get(a.shiftId) ?? [];
      existing.push(a.staffId);
      shiftAssignments.set(a.shiftId, existing);
    }

    // Check each shift
    for (const [shiftId, staffIds] of shiftAssignments) {
      const shiftInfo = context.shiftMap.get(shiftId);
      if (!shiftInfo) continue;

      // Get competency levels for all staff on this shift
      const staffLevels = staffIds.map((id) => ({
        id,
        level: context.staffMap.get(id)?.icuCompetencyLevel ?? 1,
        name: context.staffMap.get(id)
          ? `${context.staffMap.get(id)!.firstName} ${context.staffMap.get(id)!.lastName}`
          : "Unknown",
      }));

      // Find Level 1 staff
      const level1Staff = staffLevels.filter((s) => s.level === 1);

      // If there are Level 1 staff, check for preceptor at or above minPreceptorLevel
      const minPreceptorLevel = (context.ruleParameters.minPreceptorLevel as number) ?? 5;
      if (level1Staff.length > 0) {
        const hasPreceptor = staffLevels.some((s) => s.level >= minPreceptorLevel);

        if (!hasPreceptor) {
          for (const novice of level1Staff) {
            violations.push({
              ruleId: "level1-preceptor",
              ruleName: "Level 1 Must Have Preceptor",
              ruleType: "hard",
              shiftId,
              staffId: novice.id,
              description: `${novice.name} (Level 1 Novice) is assigned to ${shiftInfo.shiftType} shift on ${shiftInfo.date} without a Level ${minPreceptorLevel}+ preceptor on the same shift`,
            });
          }
        }
      }
    }

    return violations;
  },
};

/**
 * Level 2 ICU/ER Supervision Rule (Hard)
 * Level 2 (Advanced Beginner) staff cannot work ICU/ER shifts alone.
 * They MUST have a Level 4 or 5 on the same shift.
 * Even two Level 3 nurses together is not sufficient for ICU/ER.
 */
export const level2SupervisionRule: RuleEvaluator = {
  id: "level2-supervision",
  name: "Level 2 ICU/ER Supervision",
  type: "hard",
  category: "skill",
  evaluate: (context: RuleContext): RuleViolation[] => {
    const violations: RuleViolation[] = [];

    // ICU and ER units require supervision
    const supervisedUnits = ["ICU", "ER", "ED", "EMERGENCY"];

    // Group assignments by shift
    const shiftAssignments = new Map<string, string[]>();
    for (const a of context.assignments) {
      const existing = shiftAssignments.get(a.shiftId) ?? [];
      existing.push(a.staffId);
      shiftAssignments.set(a.shiftId, existing);
    }

    // Check each shift
    for (const [shiftId, staffIds] of shiftAssignments) {
      const shiftInfo = context.shiftMap.get(shiftId);
      if (!shiftInfo) continue;

      // Only check ICU/ER units — split unit name into words to avoid substring false matches
      // e.g. "Med-Surg" must not match "ED" just because "MED" contains "ED"
      const unitWords = shiftInfo.unit.toUpperCase().split(/[\s\-_]+/);
      const isSupervisionRequired = supervisedUnits.some((u) =>
        unitWords.includes(u)
      );
      if (!isSupervisionRequired) continue;

      // Get competency levels for all staff on this shift
      const staffLevels = staffIds.map((id) => ({
        id,
        level: context.staffMap.get(id)?.icuCompetencyLevel ?? 1,
        name: context.staffMap.get(id)
          ? `${context.staffMap.get(id)!.firstName} ${context.staffMap.get(id)!.lastName}`
          : "Unknown",
      }));

      // Find Level 2 staff
      const level2Staff = staffLevels.filter((s) => s.level === 2);

      // If there are Level 2 staff, check for supervisor at or above minSupervisorLevel
      const minSupervisorLevel = (context.ruleParameters.minSupervisorLevel as number) ?? 4;
      if (level2Staff.length > 0) {
        const hasSupervisor = staffLevels.some((s) => s.level >= minSupervisorLevel);

        if (!hasSupervisor) {
          for (const beginner of level2Staff) {
            violations.push({
              ruleId: "level2-supervision",
              ruleName: "Level 2 ICU/ER Supervision",
              ruleType: "hard",
              shiftId,
              staffId: beginner.id,
              description: `${beginner.name} (Level 2) is assigned to ${shiftInfo.unit} ${shiftInfo.shiftType} shift on ${shiftInfo.date} without a Level ${minSupervisorLevel}+ supervisor`,
            });
          }
        }
      }

      // Also check: if max competency on ICU/ER is below minSupervisorLevel, flag the shift
      const maxLevel = Math.max(...staffLevels.map((s) => s.level));
      if (staffLevels.length > 0 && maxLevel < minSupervisorLevel) {
        violations.push({
          ruleId: "level2-supervision",
          ruleName: "Level 2 ICU/ER Supervision",
          ruleType: "hard",
          shiftId,
          description: `${shiftInfo.unit} ${shiftInfo.shiftType} shift on ${shiftInfo.date} has no Level ${minSupervisorLevel}+ supervisor. ICU/ER requires at least one Level ${minSupervisorLevel}+ staff member.`,
        });
      }
    }

    return violations;
  },
};
