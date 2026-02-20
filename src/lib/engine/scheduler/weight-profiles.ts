import type { WeightProfile } from "./types";

/**
 * Equal weight across all soft rules.
 * Produces the best overall schedule by balancing all concerns.
 */
export const BALANCED: WeightProfile = {
  overtime: 1.0,
  preference: 1.0,
  weekendCount: 1.0,
  consecutiveWeekends: 1.0,
  holidayFairness: 1.0,
  skillMix: 1.0,
  float: 1.0,
  chargeClustering: 1.0,
};

/**
 * Heavily weights fairness dimensions (weekend distribution, holiday fairness,
 * staff preferences). Reduces cost and float penalties.
 * Produces the most equitable schedule for staff.
 */
export const FAIR: WeightProfile = {
  overtime: 0.5,
  preference: 2.0,
  weekendCount: 3.0,
  consecutiveWeekends: 3.0,
  holidayFairness: 3.0,
  skillMix: 1.0,
  float: 0.5,
  chargeClustering: 1.0,
};

/**
 * Heavily weights cost dimensions (overtime, agency/float use).
 * Reduces fairness and preference penalties.
 * Produces the most budget-efficient schedule.
 */
export const COST_OPTIMIZED: WeightProfile = {
  overtime: 3.0,
  preference: 0.5,
  weekendCount: 1.0,
  consecutiveWeekends: 1.0,
  holidayFairness: 1.0,
  skillMix: 0.5,
  float: 3.0,
  chargeClustering: 0.5,
};
