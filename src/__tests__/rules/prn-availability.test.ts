import { describe, it, expect } from "vitest";
import { prnAvailabilityRule, staffOnLeaveRule } from "@/lib/engine/rules/prn-availability";
import { makeContext, makeAssignment, makeStaff } from "../helpers/context";

describe("prn-availability rule", () => {
  it("ignores non-PRN staff entirely", () => {
    const ftStaff = makeStaff({ id: "staff-1", employmentType: "full_time" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", ftStaff]]),
      prnAvailability: [], // No PRN availability submitted
    });
    expect(prnAvailabilityRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags PRN staff scheduled when no availability submitted", () => {
    const prn = makeStaff({ id: "prn-1", employmentType: "per_diem" });
    const a1 = makeAssignment({ id: "a1", staffId: "prn-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["prn-1", prn]]),
      prnAvailability: [],
    });
    const violations = prnAvailabilityRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("prn-availability");
    expect(violations[0].description).toContain("not submitted availability");
  });

  it("flags PRN staff scheduled on a date not in their availability", () => {
    const prn = makeStaff({ id: "prn-1", employmentType: "per_diem" });
    const a1 = makeAssignment({ id: "a1", staffId: "prn-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["prn-1", prn]]),
      prnAvailability: [{ staffId: "prn-1", availableDates: ["2026-02-11", "2026-02-12"] }],
    });
    const violations = prnAvailabilityRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].description).toContain("did not mark this date as available");
  });

  it("passes when PRN staff is scheduled on an available date", () => {
    const prn = makeStaff({ id: "prn-1", employmentType: "per_diem" });
    const a1 = makeAssignment({ id: "a1", staffId: "prn-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["prn-1", prn]]),
      prnAvailability: [{ staffId: "prn-1", availableDates: ["2026-02-10", "2026-02-11"] }],
    });
    expect(prnAvailabilityRule.evaluate(ctx)).toHaveLength(0);
  });

  it("only flags the date not in availability when mixed dates", () => {
    const prn = makeStaff({ id: "prn-1", employmentType: "per_diem" });
    const a1 = makeAssignment({ id: "a1", staffId: "prn-1", date: "2026-02-10", shiftId: "s1" });
    const a2 = makeAssignment({ id: "a2", staffId: "prn-1", date: "2026-02-11", shiftId: "s2" }); // Not available
    const ctx = makeContext({
      assignments: [a1, a2],
      staffMap: new Map([["prn-1", prn]]),
      prnAvailability: [{ staffId: "prn-1", availableDates: ["2026-02-10"] }],
    });
    const violations = prnAvailabilityRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].shiftId).toBe("s2");
  });
});

describe("staff-on-leave rule", () => {
  it("ignores staff with no approved leave", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [],
    });
    expect(staffOnLeaveRule.evaluate(ctx)).toHaveLength(0);
  });

  it("ignores pending/rejected leave", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [{ staffId: "staff-1", startDate: "2026-02-08", endDate: "2026-02-15", status: "pending" }],
    });
    expect(staffOnLeaveRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags assignment during approved leave", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [{ staffId: "staff-1", startDate: "2026-02-08", endDate: "2026-02-15", status: "approved" }],
    });
    const violations = staffOnLeaveRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("staff-on-leave");
    expect(violations[0].staffId).toBe("staff-1");
    expect(violations[0].description).toContain("approved leave");
  });

  it("flags assignment on the exact start date of leave", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-08" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [{ staffId: "staff-1", startDate: "2026-02-08", endDate: "2026-02-15", status: "approved" }],
    });
    expect(staffOnLeaveRule.evaluate(ctx)).toHaveLength(1);
  });

  it("flags assignment on the exact end date of leave", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-15" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [{ staffId: "staff-1", startDate: "2026-02-08", endDate: "2026-02-15", status: "approved" }],
    });
    expect(staffOnLeaveRule.evaluate(ctx)).toHaveLength(1);
  });

  it("passes assignment one day after leave ends", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-16" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [{ staffId: "staff-1", startDate: "2026-02-08", endDate: "2026-02-15", status: "approved" }],
    });
    expect(staffOnLeaveRule.evaluate(ctx)).toHaveLength(0);
  });

  it("only reports one violation per assignment even with overlapping leaves", () => {
    const s = makeStaff({ id: "staff-1" });
    const a1 = makeAssignment({ id: "a1", staffId: "staff-1", date: "2026-02-10" });
    const ctx = makeContext({
      assignments: [a1],
      staffMap: new Map([["staff-1", s]]),
      staffLeaves: [
        { staffId: "staff-1", startDate: "2026-02-08", endDate: "2026-02-12", status: "approved" },
        { staffId: "staff-1", startDate: "2026-02-09", endDate: "2026-02-15", status: "approved" },
      ],
    });
    expect(staffOnLeaveRule.evaluate(ctx)).toHaveLength(1);
  });
});
