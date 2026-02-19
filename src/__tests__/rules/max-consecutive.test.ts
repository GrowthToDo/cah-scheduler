import { describe, it, expect } from "vitest";
import { maxConsecutiveRule } from "@/lib/engine/rules/max-consecutive";
import { makeContext, makeAssignment, makeStaff } from "../helpers/context";

describe("max-consecutive rule", () => {
  const staff = makeStaff({ id: "staff-1" });
  const staffMap = new Map([["staff-1", staff]]);

  const makeShiftAssignment = (date: string, idx: number) =>
    makeAssignment({ id: `a${idx}`, staffId: "staff-1", date, shiftId: `s${idx}` });

  it("passes with 5 consecutive days (at limit)", () => {
    const assignments = [
      "2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13",
    ].map((d, i) => makeShiftAssignment(d, i));
    const ctx = makeContext({ assignments, staffMap });
    expect(maxConsecutiveRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags the 6th consecutive day (exceeds limit of 5)", () => {
    const assignments = [
      "2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13", "2026-02-14",
    ].map((d, i) => makeShiftAssignment(d, i));
    const ctx = makeContext({ assignments, staffMap });
    const violations = maxConsecutiveRule.evaluate(ctx);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].ruleId).toBe("max-consecutive");
    expect(violations[0].staffId).toBe("staff-1");
    expect(violations[0].description).toContain("6 consecutive");
  });

  it("generates a violation for each day beyond the limit", () => {
    // 8 consecutive days should produce violations for days 6, 7, 8
    const dates = Array.from({ length: 8 }, (_, i) => {
      const d = new Date("2026-02-09");
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
    const assignments = dates.map((d, i) => makeShiftAssignment(d, i));
    const ctx = makeContext({ assignments, staffMap });
    const violations = maxConsecutiveRule.evaluate(ctx);
    expect(violations.length).toBe(3); // days 6, 7, 8
  });

  it("resets count after a day off", () => {
    const assignments = [
      "2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12", "2026-02-13",
      // gap on 14th
      "2026-02-15", "2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19",
    ].map((d, i) => makeShiftAssignment(d, i));
    const ctx = makeContext({ assignments, staffMap });
    // Two separate streaks of 5 — no violations
    expect(maxConsecutiveRule.evaluate(ctx)).toHaveLength(0);
  });

  it("uses custom maxConsecutiveDays parameter", () => {
    const assignments = [
      "2026-02-09", "2026-02-10", "2026-02-11", "2026-02-12",
    ].map((d, i) => makeShiftAssignment(d, i));
    const ctx = makeContext({ assignments, staffMap, ruleParameters: { maxConsecutiveDays: 3 } });
    const violations = maxConsecutiveRule.evaluate(ctx);
    expect(violations.length).toBe(1);
    expect(violations[0].description).toContain("4 consecutive");
  });

  it("does not flag different staff consecutively", () => {
    const staff2 = makeStaff({ id: "staff-2", firstName: "Bob", lastName: "Jones" });
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date("2026-02-09");
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
    // staff-1 only works 3 days, staff-2 works 7 days
    const staff1Assignments = dates.slice(0, 3).map((d, i) =>
      makeAssignment({ id: `a${i}`, staffId: "staff-1", date: d, shiftId: `s${i}` })
    );
    const staff2Assignments = dates.map((d, i) =>
      makeAssignment({ id: `b${i}`, staffId: "staff-2", date: d, shiftId: `s${i + 10}` })
    );
    const ctx = makeContext({
      assignments: [...staff1Assignments, ...staff2Assignments],
      staffMap: new Map([["staff-1", staff], ["staff-2", staff2]]),
    });
    const violations = maxConsecutiveRule.evaluate(ctx);
    // Only staff-2 should be flagged (7 consecutive, limit 5)
    expect(violations.every(v => v.staffId === "staff-2")).toBe(true);
  });
});
