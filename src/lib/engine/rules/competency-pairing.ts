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

      // If there are Level 1 staff, check for Level 5 preceptor
      if (level1Staff.length > 0) {
        const hasLevel5 = staffLevels.some((s) => s.level === 5);

        if (!hasLevel5) {
          for (const novice of level1Staff) {
            violations.push({
              ruleId: "level1-preceptor",
              ruleName: "Level 1 Must Have Preceptor",
              ruleType: "hard",
              shiftId,
              staffId: novice.id,
              description: `${novice.name} (Level 1 Novice) is assigned to ${shiftInfo.shiftType} shift on ${shiftInfo.date} without a Level 5 preceptor on the same shift`,
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
    const supervisedUnits = ["ICU", "ER", "ED", "Emergency"];

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

      // Only check ICU/ER units
      const isSupervisionRequired = supervisedUnits.some(
        (u) => shiftInfo.unit.toUpperCase().includes(u.toUpperCase())
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

      // If there are Level 2 staff, check for Level 4+ supervisor
      if (level2Staff.length > 0) {
        const hasLevel4OrHigher = staffLevels.some((s) => s.level >= 4);

        if (!hasLevel4OrHigher) {
          for (const beginner of level2Staff) {
            violations.push({
              ruleId: "level2-supervision",
              ruleName: "Level 2 ICU/ER Supervision",
              ruleType: "hard",
              shiftId,
              staffId: beginner.id,
              description: `${beginner.name} (Level 2) is assigned to ${shiftInfo.unit} ${shiftInfo.shiftType} shift on ${shiftInfo.date} without a Level 4+ supervisor`,
            });
          }
        }
      }

      // Also check: if only Level 3 staff on ICU/ER, that's still problematic
      // Two Level 3 nurses should not work ICU/ER without Level 4+ supervision
      const maxLevel = Math.max(...staffLevels.map((s) => s.level));
      if (maxLevel === 3 && staffLevels.length > 0) {
        violations.push({
          ruleId: "level2-supervision",
          ruleName: "Level 2 ICU/ER Supervision",
          ruleType: "hard",
          shiftId,
          description: `${shiftInfo.unit} ${shiftInfo.shiftType} shift on ${shiftInfo.date} has no Level 4+ supervisor. ICU/ER requires at least one Level 4 or 5 staff member.`,
        });
      }
    }

    return violations;
  },
};
