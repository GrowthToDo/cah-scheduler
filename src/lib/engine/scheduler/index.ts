import { buildContext } from "@/lib/engine/rule-engine";
import type { AssignmentDraft, GenerationResult, SchedulerContext, WeightProfile } from "./types";
import { greedyConstruct } from "./greedy";
import { repairHardViolations } from "./repair";
import { localSearch } from "./local-search";
import { getWeekStart } from "./state";

/**
 * Recompute isOvertime on every draft in calendar order.
 *
 * Greedy construction processes the most-constrained shifts first — often weekend
 * shifts before weekdays in the same week. isOvertime as set during construction
 * therefore reflects construction order, not the sequence a nurse actually works.
 * For example, a Saturday shift built before Thursday will show isOvertime: false
 * even though Thursday is where the 40-hour threshold was crossed in calendar time.
 *
 * This pass sorts all drafts by date/startTime and recomputes the flag correctly:
 * every shift where the nurse's cumulative weekly hours exceed 40h is marked true,
 * not just the first one in construction order.
 */
function recomputeOvertimeFlags(assignments: AssignmentDraft[]): void {
  // Sort by date then startTime to get calendar order (objects are shared refs)
  const sorted = [...assignments].sort((a, b) =>
    a.date !== b.date ? a.date.localeCompare(b.date) : a.startTime.localeCompare(b.startTime)
  );

  // staffId:weekStart → cumulative hours accumulated so far in that week
  const weekHours = new Map<string, number>();

  for (const draft of sorted) {
    const key = `${draft.staffId}:${getWeekStart(draft.date)}`;
    const current = weekHours.get(key) ?? 0;
    draft.isOvertime = current + draft.durationHours > 40;
    weekHours.set(key, current + draft.durationHours);
  }
}

/**
 * Build a SchedulerContext from a schedule ID using the existing rule-engine
 * context builder. The returned context has an empty `assignments` array so
 * the scheduler starts from a blank slate.
 */
export function buildSchedulerContext(scheduleId: string): SchedulerContext {
  // Reuse the rule-engine's context builder — it fetches all schedule data
  const ruleContext = buildContext(scheduleId);

  const staffList = [...ruleContext.staffMap.values()];
  const shifts = [...ruleContext.shiftMap.values()];

  return {
    scheduleId,
    shifts,
    staffList,
    staffMap: ruleContext.staffMap,
    prnAvailability: ruleContext.prnAvailability,
    staffLeaves: ruleContext.staffLeaves,
    unitConfig: ruleContext.unitConfig,
    scheduleUnit: ruleContext.scheduleUnit,
    publicHolidays: ruleContext.publicHolidays,
  };
}

/**
 * Generate a complete schedule using greedy construction + local search.
 *
 * @param scheduleId  The schedule to generate for
 * @param weights     Penalty weights that control which soft rules are prioritised
 * @param localSearchIterations  Number of swap attempts in the improvement phase
 */
export function generateSchedule(
  scheduleId: string,
  weights: WeightProfile,
  localSearchIterations = 500
): GenerationResult {
  const context = buildSchedulerContext(scheduleId);

  // Phase 1: Greedy construction
  const greedy = greedyConstruct(context, weights);

  // Phase 1.5: Repair hard violations
  // Attempts to fix remaining charge / Level-4+ / understaffing violations by
  // moving specialised staff from lower-priority shifts into critical slots,
  // then back-filling the vacated slots with generalist nurses.
  const repaired = repairHardViolations(greedy, context);

  // Phase 2: Local search improvement
  const improved = localSearch(repaired, context, weights, localSearchIterations);

  // Phase 3 (display fix): Recompute isOvertime in calendar order.
  // Construction uses most-constrained-first ordering, so weekend shifts are
  // built before the weekday shifts that actually trigger the 40h threshold.
  // Without this pass, the wrong shift (often a Tuesday) carries the OT badge
  // while later-in-the-week Saturday/Sunday shifts show nothing.
  recomputeOvertimeFlags(improved.assignments);

  return improved;
}

// Re-export types and profiles for convenience
export { BALANCED, FAIR, COST_OPTIMIZED } from "./weight-profiles";
export type { GenerationResult, AssignmentDraft, UnderstaffedShift, WeightProfile } from "./types";
