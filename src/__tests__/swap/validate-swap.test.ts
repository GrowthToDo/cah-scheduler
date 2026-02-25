import { describe, it, expect } from "vitest";
import {
  validateSwap,
  validateSwapSide,
  shiftsOverlap,
  type SwapSideParams,
} from "@/lib/swap/validate-swap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSide(overrides: Partial<SwapSideParams> = {}): SwapSideParams {
  return {
    staff: {
      id: "staff-1",
      name: "Alice Smith",
      role: "RN",
      icuCompetencyLevel: 3,
      isChargeNurseQualified: false,
    },
    takesShift: {
      date: "2026-03-10",
      startTime: "07:00",
      endTime: "19:00",
      isChargeNurse: false,
      unit: "ICU",
    },
    coworkersOnTakesShift: [{ icuCompetencyLevel: 4 }],
    otherAssignmentsOnDate: [],
    hasApprovedLeave: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// shiftsOverlap (unit tests)
// ---------------------------------------------------------------------------

describe("shiftsOverlap", () => {
  it("returns false when shifts are entirely separate", () => {
    expect(shiftsOverlap("07:00", "19:00", "19:00", "07:00")).toBe(false);
  });

  it("returns true when shifts overlap in the middle of the day", () => {
    expect(shiftsOverlap("07:00", "15:00", "13:00", "21:00")).toBe(true);
  });

  it("returns false when shifts are back-to-back with no gap", () => {
    // Day ends at 19:00, night starts at 19:00 — boundaries touch, no overlap
    expect(shiftsOverlap("07:00", "19:00", "19:00", "07:00")).toBe(false);
  });

  it("detects overlap when two overnight shifts on the same date share time", () => {
    // Both shifts start in the evening and end past midnight — they overlap
    expect(shiftsOverlap("19:00", "07:00", "20:00", "08:00")).toBe(true);
  });

  it("does not flag a morning shift (06:00–12:00) as overlapping with a night shift (19:00–07:00) on the same date", () => {
    // The morning shift ends at 12:00; the night shift starts at 19:00 — no overlap on that calendar date
    expect(shiftsOverlap("19:00", "07:00", "06:00", "12:00")).toBe(false);
  });

  it("returns true for identical time ranges", () => {
    expect(shiftsOverlap("07:00", "19:00", "07:00", "19:00")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateSwapSide — individual checks
// ---------------------------------------------------------------------------

describe("validateSwapSide", () => {
  it("passes for a fully eligible Level 3 RN", () => {
    const violations = validateSwapSide(makeSide());
    expect(violations).toHaveLength(0);
  });

  it("flags Level 1 staff (below ICU minimum of 2)", () => {
    const side = makeSide({
      staff: { id: "s1", name: "Bob", role: "RN", icuCompetencyLevel: 1, isChargeNurseQualified: false },
    });
    const violations = validateSwapSide(side);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("icu-competency");
    expect(violations[0].staffId).toBe("s1");
  });

  it("flags Level 3 staff taking a charge nurse assignment", () => {
    const side = makeSide({
      staff: { id: "s1", name: "Carol", role: "RN", icuCompetencyLevel: 3, isChargeNurseQualified: true },
      takesShift: { date: "2026-03-10", startTime: "07:00", endTime: "19:00", isChargeNurse: true, unit: "ICU" },
    });
    const violations = validateSwapSide(side);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("charge-nurse");
    expect(violations[0].description).toContain("Level 4 or above");
  });

  it("passes Level 4 staff taking a charge nurse assignment", () => {
    const side = makeSide({
      staff: { id: "s1", name: "Dan", role: "RN", icuCompetencyLevel: 4, isChargeNurseQualified: true },
      takesShift: { date: "2026-03-10", startTime: "07:00", endTime: "19:00", isChargeNurse: true, unit: "ICU" },
    });
    expect(validateSwapSide(side)).toHaveLength(0);
  });

  it("flags Level 2 staff with no Level 4+ coworker (supervision violation)", () => {
    const side = makeSide({
      staff: { id: "s1", name: "Eve", role: "RN", icuCompetencyLevel: 2, isChargeNurseQualified: false },
      coworkersOnTakesShift: [{ icuCompetencyLevel: 3 }, { icuCompetencyLevel: 2 }],
    });
    const violations = validateSwapSide(side);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("competency-pairing");
  });

  it("passes Level 2 staff when a Level 4+ coworker is present", () => {
    const side = makeSide({
      staff: { id: "s1", name: "Frank", role: "RN", icuCompetencyLevel: 2, isChargeNurseQualified: false },
      coworkersOnTakesShift: [{ icuCompetencyLevel: 4 }, { icuCompetencyLevel: 2 }],
    });
    expect(validateSwapSide(side)).toHaveLength(0);
  });

  it("flags approved leave conflict", () => {
    const side = makeSide({ hasApprovedLeave: true });
    const violations = validateSwapSide(side);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("leave-conflict");
  });

  it("flags same-date overlapping shift", () => {
    const side = makeSide({
      otherAssignmentsOnDate: [{ startTime: "13:00", endTime: "21:00" }],
    });
    const violations = validateSwapSide(side);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("no-overlapping-shifts");
  });

  it("does not flag non-overlapping same-date shift", () => {
    const side = makeSide({
      // Staff has a 19:00–07:00 night shift; they are taking a 07:00–19:00 day shift
      // End of day touches start of night — no overlap
      otherAssignmentsOnDate: [{ startTime: "19:00", endTime: "07:00" }],
    });
    expect(validateSwapSide(side)).toHaveLength(0);
  });

  it("reports multiple violations simultaneously", () => {
    // Level 1, charge nurse required, AND approved leave
    const side = makeSide({
      staff: { id: "s1", name: "Grace", role: "RN", icuCompetencyLevel: 1, isChargeNurseQualified: false },
      takesShift: { date: "2026-03-10", startTime: "07:00", endTime: "19:00", isChargeNurse: true, unit: "ICU" },
      hasApprovedLeave: true,
    });
    const violations = validateSwapSide(side);
    // icu-competency + charge-nurse + leave-conflict (level 1 < 4 covers charge too)
    const ruleIds = violations.map(v => v.ruleId);
    expect(ruleIds).toContain("icu-competency");
    expect(ruleIds).toContain("charge-nurse");
    expect(ruleIds).toContain("leave-conflict");
  });
});

// ---------------------------------------------------------------------------
// validateSwap — both sides together
// ---------------------------------------------------------------------------

describe("validateSwap", () => {
  it("passes when both sides are fully eligible", () => {
    const requesting = makeSide({
      staff: { id: "s1", name: "Alice", role: "RN", icuCompetencyLevel: 3, isChargeNurseQualified: false },
    });
    const target = makeSide({
      staff: { id: "s2", name: "Bob", role: "RN", icuCompetencyLevel: 4, isChargeNurseQualified: true },
      takesShift: { date: "2026-03-11", startTime: "19:00", endTime: "07:00", isChargeNurse: false, unit: "ICU" },
    });
    expect(validateSwap(requesting, target)).toHaveLength(0);
  });

  it("catches a violation on the requesting side only", () => {
    // Emily Davis (Level 3) tries to take a charge nurse slot she can't fill
    const requesting = makeSide({
      staff: { id: "emily", name: "Emily Davis", role: "RN", icuCompetencyLevel: 3, isChargeNurseQualified: false },
      takesShift: { date: "2026-03-10", startTime: "07:00", endTime: "19:00", isChargeNurse: true, unit: "ICU" },
    });
    const target = makeSide({
      staff: { id: "ashley", name: "Ashley Johnson", role: "RN", icuCompetencyLevel: 4, isChargeNurseQualified: true },
      takesShift: { date: "2026-03-11", startTime: "07:00", endTime: "19:00", isChargeNurse: false, unit: "ICU" },
    });
    const violations = validateSwap(requesting, target);
    expect(violations.some(v => v.staffId === "emily" && v.ruleId === "charge-nurse")).toBe(true);
    expect(violations.every(v => v.staffId !== "ashley")).toBe(true);
  });

  it("catches a violation on the target side (Level 2 taking charge role)", () => {
    // Level 2 staff taking a charge nurse slot — no Level 4+ will remain on their new shift
    const requesting = makeSide({
      staff: { id: "s1", name: "Alice", role: "RN", icuCompetencyLevel: 5, isChargeNurseQualified: true },
      takesShift: { date: "2026-03-10", startTime: "07:00", endTime: "19:00", isChargeNurse: false, unit: "ICU" },
    });
    const target = makeSide({
      staff: { id: "lvl2", name: "Level2 Nurse", role: "RN", icuCompetencyLevel: 2, isChargeNurseQualified: false },
      takesShift: {
        date: "2026-03-11", startTime: "07:00", endTime: "19:00", isChargeNurse: true, unit: "ICU",
      },
      coworkersOnTakesShift: [{ icuCompetencyLevel: 3 }], // no Level 4+ on the shift they'd take
    });
    const violations = validateSwap(requesting, target);
    const targetViolations = violations.filter(v => v.staffId === "lvl2");
    expect(targetViolations.some(v => v.ruleId === "charge-nurse")).toBe(true);
  });

  it("catches violations on both sides", () => {
    // Both staff have approved leave on the dates they'd be swapping to
    const s1 = makeSide({ hasApprovedLeave: true });
    const s2 = makeSide({
      staff: { id: "s2", name: "Bob", role: "RN", icuCompetencyLevel: 3, isChargeNurseQualified: false },
      hasApprovedLeave: true,
    });
    const violations = validateSwap(s1, s2);
    expect(violations.filter(v => v.ruleId === "leave-conflict")).toHaveLength(2);
  });
});
