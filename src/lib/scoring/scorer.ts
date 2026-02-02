import { buildContext } from "@/lib/engine/rule-engine";
import type { RuleContext } from "@/lib/engine/rules/types";

export interface ScoreBreakdown {
  overall: number;
  coverage: number;
  fairness: number;
  cost: number;
  preference: number;
  skillMix: number;
}

/**
 * Scores a schedule across 5 dimensions.
 * Each dimension returns 0.0 (best) to 1.0 (worst).
 * Overall score is a weighted average.
 */
export function scoreSchedule(scheduleId: string): ScoreBreakdown {
  const context = buildContext(scheduleId);

  const coverage = scoreCoverage(context);
  const fairness = scoreFairness(context);
  const cost = scoreCost(context);
  const preference = scorePreference(context);
  const skillMix = scoreSkillMix(context);

  // Weighted average
  const weights = { coverage: 3, fairness: 2, cost: 2, preference: 1.5, skillMix: 1 };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const overall =
    (coverage * weights.coverage +
      fairness * weights.fairness +
      cost * weights.cost +
      preference * weights.preference +
      skillMix * weights.skillMix) /
    totalWeight;

  return {
    overall: round(overall),
    coverage: round(coverage),
    fairness: round(fairness),
    cost: round(cost),
    preference: round(preference),
    skillMix: round(skillMix),
  };
}

function scoreCoverage(ctx: RuleContext): number {
  let totalSlots = 0;
  let filledSlots = 0;
  let chargeSlots = 0;
  let chargesFilled = 0;

  for (const [shiftId, shift] of ctx.shiftMap) {
    const assigned = ctx.assignments.filter((a) => a.shiftId === shiftId).length;
    totalSlots += shift.requiredStaffCount;
    filledSlots += Math.min(assigned, shift.requiredStaffCount);

    if (shift.requiresChargeNurse) {
      chargeSlots++;
      const hasCharge = ctx.assignments.some(
        (a) => a.shiftId === shiftId && a.isChargeNurse
      );
      if (hasCharge) chargesFilled++;
    }
  }

  if (totalSlots === 0) return 0;

  const staffFill = filledSlots / totalSlots;
  const chargeFill = chargeSlots > 0 ? chargesFilled / chargeSlots : 1;

  return 1 - (staffFill * 0.7 + chargeFill * 0.3);
}

function scoreFairness(ctx: RuleContext): number {
  // Standard deviation of weekend shifts per staff
  const weekendCounts = new Map<string, number>();
  const activeStaff = new Set<string>();

  for (const a of ctx.assignments) {
    activeStaff.add(a.staffId);
    const day = new Date(a.date).getDay();
    if (day === 0 || day === 6) {
      weekendCounts.set(a.staffId, (weekendCounts.get(a.staffId) ?? 0) + 1);
    }
  }

  for (const staffId of activeStaff) {
    if (!weekendCounts.has(staffId)) weekendCounts.set(staffId, 0);
  }

  const counts = [...weekendCounts.values()];
  if (counts.length < 2) return 0;

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
  const stdDev = Math.sqrt(variance);

  // Normalize: stdDev of 3+ is worst case
  return Math.min(stdDev / 3, 1);
}

function scoreCost(ctx: RuleContext): number {
  const otAssignments = ctx.assignments.filter((a) => a.isOvertime).length;
  const totalAssignments = ctx.assignments.length;

  if (totalAssignments === 0) return 0;

  // OT ratio: >30% is worst case
  return Math.min((otAssignments / totalAssignments) / 0.3, 1);
}

function scorePreference(ctx: RuleContext): number {
  let totalChecks = 0;
  let mismatches = 0;

  for (const a of ctx.assignments) {
    const staff = ctx.staffMap.get(a.staffId);
    if (!staff?.preferences) continue;

    const prefs = staff.preferences;

    // Shift type preference
    totalChecks++;
    if (prefs.preferredShift !== "any" && prefs.preferredShift !== a.shiftType) {
      mismatches++;
    }

    // Day off preference
    const dayOfWeek = new Date(a.date).toLocaleDateString("en-US", { weekday: "long" });
    if (prefs.preferredDaysOff.length > 0) {
      totalChecks++;
      if (prefs.preferredDaysOff.includes(dayOfWeek)) {
        mismatches++;
      }
    }

    // Weekend avoidance
    if (prefs.avoidWeekends) {
      const day = new Date(a.date).getDay();
      if (day === 0 || day === 6) {
        totalChecks++;
        mismatches++;
      }
    }
  }

  if (totalChecks === 0) return 0;
  return mismatches / totalChecks;
}

function scoreSkillMix(ctx: RuleContext): number {
  let totalShifts = 0;
  let poorMix = 0;

  for (const [shiftId] of ctx.shiftMap) {
    const assigned = ctx.assignments.filter((a) => a.shiftId === shiftId);
    if (assigned.length < 2) continue;

    totalShifts++;
    const levels = assigned
      .map((a) => ctx.staffMap.get(a.staffId)?.icuCompetencyLevel ?? 0)
      .filter((l) => l > 0);

    if (levels.length < 2) continue;

    const range = Math.max(...levels) - Math.min(...levels);
    if (range === 0) poorMix++;
  }

  if (totalShifts === 0) return 0;
  return poorMix / totalShifts;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
