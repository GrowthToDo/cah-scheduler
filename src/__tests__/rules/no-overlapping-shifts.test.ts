import { describe, it, expect } from "vitest";
import { noOverlappingShiftsRule } from "@/lib/engine/rules/no-overlapping-shifts";
import { makeContext, makeAssignment, makeStaff, makeShift } from "../helpers/context";

describe("no-overlapping-shifts rule", () => {
  const staff = makeStaff({ id: "staff-1" });
  const staffMap = new Map([["staff-1", staff]]);

  it("passes with single assignment", () => {
    const s1 = makeShift({ id: "s1" });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", startTime: "07:00", endTime: "19:00", date: "2026-02-10" });
    const ctx = makeContext({ assignments: [a1], shiftMap: new Map([["s1", s1]]), staffMap });
    expect(noOverlappingShiftsRule.evaluate(ctx)).toHaveLength(0);
  });

  it("passes when shifts are on same day but non-overlapping", () => {
    const s1 = makeShift({ id: "s1" });
    const s2 = makeShift({ id: "s2" });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", startTime: "07:00", endTime: "15:00", date: "2026-02-10" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s2", staffId: "staff-1", startTime: "15:00", endTime: "23:00", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1, a2],
      shiftMap: new Map([["s1", s1], ["s2", s2]]),
      staffMap,
    });
    // Back-to-back shifts (no overlap)
    expect(noOverlappingShiftsRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags overlapping shifts on same day", () => {
    const s1 = makeShift({ id: "s1" });
    const s2 = makeShift({ id: "s2" });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", startTime: "07:00", endTime: "19:00", date: "2026-02-10" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s2", staffId: "staff-1", startTime: "13:00", endTime: "21:00", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1, a2],
      shiftMap: new Map([["s1", s1], ["s2", s2]]),
      staffMap,
    });
    const violations = noOverlappingShiftsRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("no-overlapping-shifts");
    expect(violations[0].staffId).toBe("staff-1");
  });

  it("flags overnight shift that overlaps with next day's early shift", () => {
    const s1 = makeShift({ id: "s1" });
    const s2 = makeShift({ id: "s2" });
    // Night shift: 19:00 - 07:00 (crosses midnight into Feb 11)
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", startTime: "19:00", endTime: "07:00", date: "2026-02-10" });
    // Morning shift Feb 11: 05:00 - 13:00 — overlaps with the night shift that ends at 07:00
    const a2 = makeAssignment({ id: "a2", shiftId: "s2", staffId: "staff-1", startTime: "05:00", endTime: "13:00", date: "2026-02-11" });
    const ctx = makeContext({
      assignments: [a1, a2],
      shiftMap: new Map([["s1", s1], ["s2", s2]]),
      staffMap,
    });
    const violations = noOverlappingShiftsRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
  });

  it("does not flag overnight shift followed by shift next evening", () => {
    const s1 = makeShift({ id: "s1" });
    const s2 = makeShift({ id: "s2" });
    // Night shift ends at 07:00 Feb 11, next shift starts at 19:00 Feb 11 — no overlap
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", startTime: "19:00", endTime: "07:00", date: "2026-02-10" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s2", staffId: "staff-1", startTime: "19:00", endTime: "07:00", date: "2026-02-11" });
    const ctx = makeContext({
      assignments: [a1, a2],
      shiftMap: new Map([["s1", s1], ["s2", s2]]),
      staffMap,
    });
    expect(noOverlappingShiftsRule.evaluate(ctx)).toHaveLength(0);
  });

  it("does not flag overlapping shifts for different staff members", () => {
    const staff2 = makeStaff({ id: "staff-2", firstName: "Bob", lastName: "Jones" });
    const s1 = makeShift({ id: "s1" });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", startTime: "07:00", endTime: "19:00", date: "2026-02-10" });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "staff-2", startTime: "07:00", endTime: "19:00", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1, a2],
      shiftMap: new Map([["s1", s1]]),
      staffMap: new Map([["staff-1", staff], ["staff-2", staff2]]),
    });
    expect(noOverlappingShiftsRule.evaluate(ctx)).toHaveLength(0);
  });
});
