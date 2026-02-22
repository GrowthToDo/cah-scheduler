import { buildContext } from "@/lib/engine/rule-engine";
import type { GenerationResult, SchedulerContext, WeightProfile } from "./types";
import { greedyConstruct } from "./greedy";
import { repairHardViolations } from "./repair";
import { localSearch } from "./local-search";

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

  return improved;
}

// Re-export types and profiles for convenience
export { BALANCED, FAIR, COST_OPTIMIZED } from "./weight-profiles";
export type { GenerationResult, AssignmentDraft, UnderstaffedShift, WeightProfile } from "./types";
