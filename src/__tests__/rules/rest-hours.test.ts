import { describe, it, expect } from "vitest";
import { restHoursRule } from "@/lib/engine/rules/rest-hours";
import { makeContext, makeAssignment, makeStaff } from "../helpers/context";

describe("rest-hours rule", () => {
  const staff = makeStaff({ id: "staff-1" });
  const staffMap = new Map([["staff-1", staff]]);

  it("passes when only one assignment (no pair to check)", () => {
    const a1 = makeAssignment({ staffId: "staff-1", date: "2026-02-10", startTime: "07:00", endTime: "19:00" });
    const ctx = makeContext({ assignments: [a1], staffMap });
    expect(restHoursRule.evaluate(ctx)).toHaveLength(0);
  });

  it("passes when rest between shifts is exactly 10 hours", () => {
    // Day shift ends 19:00, night shift starts 05:00 next day = 10h rest
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10", startTime: "07:00", endTime: "19:00", shiftType: "day", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "staff-1", date: "2026-02-11", startTime: "05:00", endTime: "17:00", shiftType: "day", shiftId: "s2" });
    const ctx = makeContext({ assignments: [a1, a2], staffMap });
    expect(restHoursRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags when rest between day shifts is less than 10 hours", () => {
    // Day shift ends 19:00, next starts 04:00 next day = 9h rest
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10", startTime: "07:00", endTime: "19:00", shiftType: "day", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "staff-1", date: "2026-02-11", startTime: "04:00", endTime: "16:00", shiftType: "day", shiftId: "s2" });
    const ctx = makeContext({ assignments: [a1, a2], staffMap });
    const violations = restHoursRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("rest-hours");
    expect(violations[0].staffId).toBe("staff-1");
    expect(violations[0].description).toContain("9.0h rest");
  });

  it("handles overnight (night) shift crossing midnight correctly", () => {
    // Night shift: 19:00 to 07:00 (next day). Next shift starts 07:00 = exactly 0h rest -> violation
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10", startTime: "19:00", endTime: "07:00", shiftType: "night", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "staff-1", date: "2026-02-11", startTime: "07:00", endTime: "19:00", shiftType: "day", shiftId: "s2" });
    const ctx = makeContext({ assignments: [a1, a2], staffMap });
    const violations = restHoursRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].description).toContain("0.0h rest");
  });

  it("passes when overnight shift has sufficient rest before next day's shift", () => {
    // Night shift 19:00-07:00, next shift starts 19:00 = 12h rest
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10", startTime: "19:00", endTime: "07:00", shiftType: "night", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "staff-1", date: "2026-02-11", startTime: "19:00", endTime: "07:00", shiftType: "night", shiftId: "s2" });
    const ctx = makeContext({ assignments: [a1, a2], staffMap });
    expect(restHoursRule.evaluate(ctx)).toHaveLength(0);
  });

  it("uses custom minRestHours parameter when provided", () => {
    // 8h rest between shifts, rule parameter says 8h is fine
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10", startTime: "07:00", endTime: "19:00", shiftType: "day", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "staff-1", date: "2026-02-11", startTime: "03:00", endTime: "15:00", shiftType: "day", shiftId: "s2" });
    // 19:00 to 03:00 = 8h rest
    const ctx = makeContext({ assignments: [a1, a2], staffMap, ruleParameters: { minRestHours: 8 } });
    expect(restHoursRule.evaluate(ctx)).toHaveLength(0);
  });

  it("does not flag rest gaps between different staff members", () => {
    const staff2 = makeStaff({ id: "staff-2", firstName: "Bob", lastName: "Jones" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10", startTime: "07:00", endTime: "19:00", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "staff-2", date: "2026-02-10", startTime: "20:00", endTime: "08:00", shiftId: "s2" });
    const ctx = makeContext({
      assignments: [a1, a2],
      staffMap: new Map([["staff-1", staff], ["staff-2", staff2]]),
    });
    expect(restHoursRule.evaluate(ctx)).toHaveLength(0);
  });
});
