import { describe, it, expect } from "vitest";
import { level1PreceptorRule, level2SupervisionRule } from "@/lib/engine/rules/competency-pairing";
import { makeContext, makeAssignment, makeStaff, makeShift } from "../helpers/context";

describe("level1-preceptor rule", () => {
  it("passes when no level-1 staff are assigned", () => {
    const shift = makeShift({ id: "s1" });
    const s1 = makeStaff({ id: "staff-1", icuCompetencyLevel: 3 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", s1]]),
      assignments: [a1],
    });
    expect(level1PreceptorRule.evaluate(ctx)).toHaveLength(0);
  });

  it("passes when level-1 has a level-5 preceptor on same shift", () => {
    const shift = makeShift({ id: "s1" });
    const novice = makeStaff({ id: "novice", icuCompetencyLevel: 1 });
    const expert = makeStaff({ id: "expert", icuCompetencyLevel: 5 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "novice" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "expert" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["novice", novice], ["expert", expert]]),
      assignments: [a1, a2],
    });
    expect(level1PreceptorRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags level-1 staff with no level-5 on shift", () => {
    const shift = makeShift({ id: "s1" });
    const novice = makeStaff({ id: "novice", icuCompetencyLevel: 1 });
    const mid = makeStaff({ id: "mid", icuCompetencyLevel: 4 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "novice" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "mid" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["novice", novice], ["mid", mid]]),
      assignments: [a1, a2],
    });
    const violations = level1PreceptorRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("level1-preceptor");
    expect(violations[0].staffId).toBe("novice");
    expect(violations[0].description).toContain("Level 5 preceptor");
  });

  it("flags level-1 staff working alone", () => {
    const shift = makeShift({ id: "s1" });
    const novice = makeStaff({ id: "novice", icuCompetencyLevel: 1 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "novice" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["novice", novice]]),
      assignments: [a1],
    });
    const violations = level1PreceptorRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
  });

  it("flags each level-1 staff when multiple novices lack a preceptor", () => {
    const shift = makeShift({ id: "s1" });
    const n1 = makeStaff({ id: "novice-1", icuCompetencyLevel: 1 });
    const n2 = makeStaff({ id: "novice-2", icuCompetencyLevel: 1 });
    const mid = makeStaff({ id: "mid", icuCompetencyLevel: 3 }); // Not level 5
    const assignments = [
      makeAssignment({ id: "a1", shiftId: "s1", staffId: "novice-1" }),
      makeAssignment({ id: "a2", shiftId: "s1", staffId: "novice-2" }),
      makeAssignment({ id: "a3", shiftId: "s1", staffId: "mid" }),
    ];
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["novice-1", n1], ["novice-2", n2], ["mid", mid]]),
      assignments,
    });
    const violations = level1PreceptorRule.evaluate(ctx);
    expect(violations).toHaveLength(2);
  });
});

describe("level2-supervision rule", () => {
  it("passes for non-ICU/ER units regardless of competency", () => {
    const shift = makeShift({ id: "s1", unit: "Med-Surg" });
    const beginner = makeStaff({ id: "staff-1", icuCompetencyLevel: 2 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", beginner]]),
      assignments: [a1],
    });
    expect(level2SupervisionRule.evaluate(ctx)).toHaveLength(0);
  });

  it("passes when level-2 has level-4 supervisor on ICU shift", () => {
    const shift = makeShift({ id: "s1", unit: "ICU" });
    const beginner = makeStaff({ id: "staff-1", icuCompetencyLevel: 2 });
    const supervisor = makeStaff({ id: "staff-2", icuCompetencyLevel: 4 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "staff-2" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", beginner], ["staff-2", supervisor]]),
      assignments: [a1, a2],
    });
    expect(level2SupervisionRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags level-2 on ICU without level-4+ supervisor", () => {
    const shift = makeShift({ id: "s1", unit: "ICU" });
    const beginner = makeStaff({ id: "staff-1", icuCompetencyLevel: 2 });
    const mid = makeStaff({ id: "staff-2", icuCompetencyLevel: 3 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "staff-2" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", beginner], ["staff-2", mid]]),
      assignments: [a1, a2],
    });
    const violations = level2SupervisionRule.evaluate(ctx);
    // One for level-2 without supervisor, one for all-level-3 situation
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.some(v => v.ruleId === "level2-supervision")).toBe(true);
  });

  it("flags ICU shift with only level-3 staff (no Level 4+ at all)", () => {
    const shift = makeShift({ id: "s1", unit: "ICU" });
    const s1 = makeStaff({ id: "staff-1", icuCompetencyLevel: 3 });
    const s2 = makeStaff({ id: "staff-2", icuCompetencyLevel: 3 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "staff-2" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", s1], ["staff-2", s2]]),
      assignments: [a1, a2],
    });
    const violations = level2SupervisionRule.evaluate(ctx);
    expect(violations.some(v => v.description.includes("no Level 4+"))).toBe(true);
  });

  it("flags ER unit the same way as ICU", () => {
    const shift = makeShift({ id: "s1", unit: "ER" });
    const beginner = makeStaff({ id: "staff-1", icuCompetencyLevel: 2 });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1" });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", beginner]]),
      assignments: [a1],
    });
    const violations = level2SupervisionRule.evaluate(ctx);
    expect(violations.length).toBeGreaterThan(0);
  });
});
