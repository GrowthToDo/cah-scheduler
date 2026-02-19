import { describe, it, expect } from "vitest";
import { chargeNurseRule } from "@/lib/engine/rules/charge-nurse";
import { makeContext, makeShift, makeAssignment, makeStaff } from "../helpers/context";

describe("charge-nurse rule", () => {
  it("passes when shift does not require a charge nurse", () => {
    const shift = makeShift({ id: "s1", requiresChargeNurse: false });
    const staff = makeStaff({ id: "staff-1", isChargeNurseQualified: false });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", isChargeNurse: false });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", staff]]),
      assignments: [a1],
    });
    expect(chargeNurseRule.evaluate(ctx)).toHaveLength(0);
  });

  it("passes when shift has a qualified charge nurse", () => {
    const shift = makeShift({ id: "s1", requiresChargeNurse: true });
    const staff = makeStaff({ id: "staff-1", isChargeNurseQualified: true });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", isChargeNurse: true });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", staff]]),
      assignments: [a1],
    });
    expect(chargeNurseRule.evaluate(ctx)).toHaveLength(0);
  });

  it("flags when charge nurse is not qualified even if flagged as charge", () => {
    const shift = makeShift({ id: "s1", requiresChargeNurse: true });
    const staff = makeStaff({ id: "staff-1", isChargeNurseQualified: false });
    // isChargeNurse=true in assignment, but staff not qualified
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", isChargeNurse: true });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", staff]]),
      assignments: [a1],
    });
    const violations = chargeNurseRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleId).toBe("charge-nurse");
  });

  it("flags when charge nurse required but nobody marked as charge", () => {
    const shift = makeShift({ id: "s1", requiresChargeNurse: true });
    const staff = makeStaff({ id: "staff-1", isChargeNurseQualified: true });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", isChargeNurse: false });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", staff]]),
      assignments: [a1],
    });
    const violations = chargeNurseRule.evaluate(ctx);
    expect(violations).toHaveLength(1);
    expect(violations[0].ruleType).toBe("hard");
  });

  it("does not flag empty shifts (no violation for unassigned charge shifts)", () => {
    // Charge nurse rule only fires if there ARE assignments but no charge nurse
    const shift = makeShift({ id: "s1", requiresChargeNurse: true });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      assignments: [],
    });
    // Empty shift: no assignments, so no violation (min-staff handles the coverage gap)
    expect(chargeNurseRule.evaluate(ctx)).toHaveLength(0);
  });

  it("passes when at least one among multiple staff is qualified charge nurse", () => {
    const shift = makeShift({ id: "s1", requiresChargeNurse: true });
    const staff1 = makeStaff({ id: "staff-1", isChargeNurseQualified: false });
    const staff2 = makeStaff({ id: "staff-2", isChargeNurseQualified: true });
    const a1 = makeAssignment({ id: "a1", shiftId: "s1", staffId: "staff-1", isChargeNurse: false });
    const a2 = makeAssignment({ id: "a2", shiftId: "s1", staffId: "staff-2", isChargeNurse: true });
    const ctx = makeContext({
      shiftMap: new Map([["s1", shift]]),
      staffMap: new Map([["staff-1", staff1], ["staff-2", staff2]]),
      assignments: [a1, a2],
    });
    expect(chargeNurseRule.evaluate(ctx)).toHaveLength(0);
  });
});
