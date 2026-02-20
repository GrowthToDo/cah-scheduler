import type { StaffInfo } from "@/lib/engine/rules/types";
import type { AssignmentDraft, GenerationResult, SchedulerContext, WeightProfile } from "./types";
import { SchedulerState } from "./state";
import { passesHardRules } from "./eligibility";
import { softPenalty } from "./scoring";

/**
 * Compute a proxy total penalty from a flat list of assignments.
 * Rebuilds an in-memory state and sums individual assignment penalties.
 */
function computeTotalPenalty(
  assignments: AssignmentDraft[],
  context: SchedulerContext,
  weights: WeightProfile
): number {
  // Build state from scratch
  const state = new SchedulerState();
  for (const a of assignments) {
    state.addAssignment(a);
  }

  let total = 0;
  for (const a of assignments) {
    const staffInfo = context.staffMap.get(a.staffId);
    const shiftInfo = context.shifts.find((s) => s.id === a.shiftId);
    if (!staffInfo || !shiftInfo) continue;

    // Temporarily remove this assignment from state to compute the marginal penalty
    // (approximate: we use the full-state penalty for simplicity)
    const currentShiftAssignments = assignments.filter(
      (x) => x.shiftId === a.shiftId && x.staffId !== a.staffId
    );

    total += softPenalty(
      staffInfo,
      shiftInfo,
      state,
      weights,
      currentShiftAssignments,
      context.staffMap,
      a.isChargeNurse,
      context.unitConfig
    );
  }
  return total;
}

/**
 * Quick hard-rule check for a proposed swap.
 * Only checks the constraints that are affected by changing which shift a staff
 * member is assigned to — not the full SchedulerState rebuild.
 */
function isSwapValid(
  allAssignments: AssignmentDraft[],
  indexA: number,
  indexB: number,
  context: SchedulerContext
): boolean {
  const a = allAssignments[indexA];
  const b = allAssignments[indexB];

  const staffA = context.staffMap.get(a.staffId);
  const staffB = context.staffMap.get(b.staffId);
  const shiftA = context.shifts.find((s) => s.id === a.shiftId);
  const shiftB = context.shifts.find((s) => s.id === b.shiftId);

  if (!staffA || !staffB || !shiftA || !shiftB) return false;

  // Build a temporary state excluding the two assignments being swapped
  const remaining = allAssignments.filter((_, i) => i !== indexA && i !== indexB);
  const tempState = new SchedulerState();
  for (const r of remaining) tempState.addAssignment(r);

  // Check: staffA → shiftB, staffB → shiftA
  if (!passesHardRules(staffA, shiftB, tempState, context)) return false;
  // Add staffA to shiftB temporarily for staffB check
  const draftA: AssignmentDraft = {
    ...a,
    shiftId: shiftB.id,
    date: shiftB.date,
    shiftType: shiftB.shiftType,
    startTime: shiftB.startTime,
    endTime: shiftB.endTime,
    durationHours: shiftB.durationHours,
    unit: shiftB.unit,
    isFloat: !!(staffA.homeUnit && staffA.homeUnit !== shiftB.unit),
    floatFromUnit: staffA.homeUnit && staffA.homeUnit !== shiftB.unit ? (staffA.homeUnit ?? null) : null,
  };
  tempState.addAssignment(draftA);
  if (!passesHardRules(staffB, shiftA, tempState, context)) return false;

  return true;
}

/**
 * Local search: improves the greedy result via random swap moves.
 *
 * Each iteration picks two random assignments on different shifts and tries
 * swapping their staff members. If the swap passes all hard rules and reduces
 * total penalty, it is accepted (hill-climbing / steepest-descent variant).
 *
 * This is intentionally simple — CAH scale (~300 assignments) doesn't need
 * simulated annealing or sophisticated metaheuristics.
 */
export function localSearch(
  result: GenerationResult,
  context: SchedulerContext,
  weights: WeightProfile,
  maxIterations = 500
): GenerationResult {
  if (result.assignments.length < 4) return result;

  let assignments = [...result.assignments];
  let currentPenalty = computeTotalPenalty(assignments, context, weights);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Pick two distinct random assignments on different shifts
    const i = Math.floor(Math.random() * assignments.length);
    let j = Math.floor(Math.random() * assignments.length);
    let tries = 0;
    while ((j === i || assignments[i].shiftId === assignments[j].shiftId) && tries < 10) {
      j = Math.floor(Math.random() * assignments.length);
      tries++;
    }
    if (j === i || assignments[i].shiftId === assignments[j].shiftId) continue;

    if (!isSwapValid(assignments, i, j, context)) continue;

    // Build the swapped assignment list
    const a = assignments[i];
    const b = assignments[j];
    const shiftA = context.shifts.find((s) => s.id === a.shiftId)!;
    const shiftB = context.shifts.find((s) => s.id === b.shiftId)!;
    const staffA = context.staffMap.get(a.staffId)!;
    const staffB = context.staffMap.get(b.staffId)!;

    const newA: AssignmentDraft = {
      ...a,
      staffId: b.staffId,
      unit: shiftA.unit,
      isFloat: !!(staffB.homeUnit && staffB.homeUnit !== shiftA.unit),
      floatFromUnit: staffB.homeUnit && staffB.homeUnit !== shiftA.unit ? (staffB.homeUnit ?? null) : null,
    };
    const newB: AssignmentDraft = {
      ...b,
      staffId: a.staffId,
      unit: shiftB.unit,
      isFloat: !!(staffA.homeUnit && staffA.homeUnit !== shiftB.unit),
      floatFromUnit: staffA.homeUnit && staffA.homeUnit !== shiftB.unit ? (staffA.homeUnit ?? null) : null,
    };

    const swapped = [...assignments];
    swapped[i] = newA;
    swapped[j] = newB;

    const newPenalty = computeTotalPenalty(swapped, context, weights);
    if (newPenalty < currentPenalty) {
      assignments = swapped;
      currentPenalty = newPenalty;
    }
  }

  return { assignments, understaffed: result.understaffed };
}
