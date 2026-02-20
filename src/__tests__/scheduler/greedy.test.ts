import { describe, it, expect } from "vitest";
import { greedyConstruct } from "@/lib/engine/scheduler/greedy";
import { BALANCED, FAIR, COST_OPTIMIZED } from "@/lib/engine/scheduler/weight-profiles";
import type { SchedulerContext } from "@/lib/engine/scheduler/types";
import type { StaffInfo, ShiftInfo, UnitConfig } from "@/lib/engine/rules/types";

// ─── Minimal fixture helpers ──────────────────────────────────────────────────

function makeStaff(id: string, overrides: Partial<StaffInfo> = {}): StaffInfo {
  return {
    id,
    firstName: "Nurse",
    lastName: id,
    role: "RN",
    employmentType: "full_time",
    icuCompetencyLevel: 3,
    isChargeNurseQualified: false,
    certifications: [],
    fte: 1.0,
    reliabilityRating: 4,
    homeUnit: "Med-Surg",
    crossTrainedUnits: [],
    weekendExempt: false,
    isActive: true,
    preferences: null,
    ...overrides,
  };
}

function makeShift(id: string, date: string, overrides: Partial<ShiftInfo> = {}): ShiftInfo {
  return {
    id,
    date,
    shiftType: "day",
    startTime: "07:00",
    endTime: "19:00",
    durationHours: 12,
    requiredStaffCount: 2,
    requiresChargeNurse: false,
    actualCensus: null,
    unit: "Med-Surg",
    countsTowardStaffing: true,
    acuityLevel: null,
    acuityExtraStaff: 0,
    sitterCount: 0,
    ...overrides,
  };
}

const defaultUnitConfig: UnitConfig = {
  id: "unit-1",
  name: "Med-Surg",
  weekendRuleType: "count_per_period",
  weekendShiftsRequired: 3,
  schedulePeriodWeeks: 6,
  holidayShiftsRequired: 1,
  maxOnCallPerWeek: 1,
  maxOnCallWeekendsPerMonth: 1,
  maxConsecutiveWeekends: 2,
  acuityYellowExtraStaff: 1,
  acuityRedExtraStaff: 2,
};

function makeContext(
  shifts: ShiftInfo[],
  staff: StaffInfo[],
  overrides: Partial<SchedulerContext> = {}
): SchedulerContext {
  return {
    scheduleId: "sched-1",
    shifts,
    staffList: staff,
    staffMap: new Map(staff.map((s) => [s.id, s])),
    prnAvailability: [],
    staffLeaves: [],
    unitConfig: defaultUnitConfig,
    scheduleUnit: "Med-Surg",
    publicHolidays: [],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("greedyConstruct", () => {
  it("fills all slots when enough staff are available", () => {
    const staff = Array.from({ length: 5 }, (_, i) => makeStaff(`s${i + 1}`));
    const shifts = [
      makeShift("sh1", "2026-02-09", { requiredStaffCount: 2 }),
      makeShift("sh2", "2026-02-10", { requiredStaffCount: 2 }),
    ];
    const ctx = makeContext(shifts, staff);
    const result = greedyConstruct(ctx, BALANCED);

    expect(result.understaffed).toHaveLength(0);
    expect(result.assignments).toHaveLength(4);
  });

  it("does not assign the same staff member twice on the same shift", () => {
    const staff = Array.from({ length: 4 }, (_, i) => makeStaff(`s${i + 1}`));
    const shifts = [makeShift("sh1", "2026-02-09", { requiredStaffCount: 3 })];
    const ctx = makeContext(shifts, staff);
    const result = greedyConstruct(ctx, BALANCED);

    const assignedToShift1 = result.assignments.filter((a) => a.shiftId === "sh1");
    const staffIds = assignedToShift1.map((a) => a.staffId);
    const uniqueIds = new Set(staffIds);
    expect(uniqueIds.size).toBe(staffIds.length);
  });

  it("respects hard rule: fills charge nurse slot when requiresChargeNurse is true", () => {
    const chargeNurse = makeStaff("charge-1", { isChargeNurseQualified: true });
    const regular = Array.from({ length: 4 }, (_, i) => makeStaff(`rn${i + 1}`, { isChargeNurseQualified: false }));
    const staff = [chargeNurse, ...regular];
    const shifts = [makeShift("sh1", "2026-02-09", { requiresChargeNurse: true, requiredStaffCount: 3 })];
    const ctx = makeContext(shifts, staff);
    const result = greedyConstruct(ctx, BALANCED);

    const chargeAssignment = result.assignments.find((a) => a.isChargeNurse);
    expect(chargeAssignment).toBeDefined();
    expect(chargeAssignment!.staffId).toBe("charge-1");
  });

  it("records understaffed shift when not enough eligible staff", () => {
    // 1 staff, shift requires 3
    const staff = [makeStaff("s1")];
    const shifts = [makeShift("sh1", "2026-02-09", { requiredStaffCount: 3 })];
    const ctx = makeContext(shifts, staff);
    const result = greedyConstruct(ctx, BALANCED);

    expect(result.understaffed).toHaveLength(1);
    expect(result.understaffed[0].shiftId).toBe("sh1");
    expect(result.understaffed[0].required).toBe(3);
    expect(result.understaffed[0].assigned).toBe(1);
  });

  it("enforces rest-hours hard rule across shifts", () => {
    // 1 staff member; two overlapping shifts (no rest between them)
    const staff = [makeStaff("s1")];
    // Shift 1: 07:00–19:00, Shift 2 starts 08:00 same day (overlaps)
    const shifts = [
      makeShift("sh1", "2026-02-09", { startTime: "07:00", durationHours: 12 }),
      makeShift("sh2", "2026-02-09", { startTime: "08:00", durationHours: 12 }),
    ];
    const ctx = makeContext(shifts, staff);
    const result = greedyConstruct(ctx, BALANCED);

    // Staff can only be on one of the two overlapping shifts
    const assignmentsForS1 = result.assignments.filter((a) => a.staffId === "s1");
    expect(assignmentsForS1.length).toBe(1);
  });

  it("skips inactive staff", () => {
    const inactive = makeStaff("inactive-1", { isActive: false });
    const active = makeStaff("active-1");
    const shifts = [makeShift("sh1", "2026-02-09", { requiredStaffCount: 1 })];
    const ctx = makeContext(shifts, [inactive, active]);
    const result = greedyConstruct(ctx, BALANCED);

    expect(result.assignments.every((a) => a.staffId !== "inactive-1")).toBe(true);
  });

  it("marks float assignments when staff assigned outside home unit", () => {
    const floatStaff = makeStaff("float-1", { homeUnit: "ICU", crossTrainedUnits: ["Med-Surg"] });
    const shifts = [makeShift("sh1", "2026-02-09", { unit: "Med-Surg", requiredStaffCount: 1 })];
    const ctx = makeContext(shifts, [floatStaff]);
    const result = greedyConstruct(ctx, BALANCED);

    const floatAssignment = result.assignments.find((a) => a.staffId === "float-1");
    expect(floatAssignment?.isFloat).toBe(true);
    expect(floatAssignment?.floatFromUnit).toBe("ICU");
  });

  it("marks overtime assignments when weekly hours exceed 40", () => {
    // Staff with 36h already this week (Mon–Wed = 3×12h)
    // But we can't pre-populate state directly in greedyConstruct — instead use
    // a scenario where staff gets 4 shifts (Mon–Thu = 48h total → last is OT)
    const staff = [makeStaff("s1")];
    // 4 shifts spread over Mon–Thu, each 12h
    const shifts = [
      makeShift("sh1", "2026-02-09", { requiredStaffCount: 1 }), // Mon (12h)
      makeShift("sh2", "2026-02-10", { requiredStaffCount: 1 }), // Tue (24h)
      makeShift("sh3", "2026-02-11", { requiredStaffCount: 1 }), // Wed (36h)
      makeShift("sh4", "2026-02-12", { requiredStaffCount: 1 }), // Thu (48h → OT)
    ];
    const ctx = makeContext(shifts, staff);
    const result = greedyConstruct(ctx, BALANCED);

    const sh4Assignment = result.assignments.find((a) => a.shiftId === "sh4");
    expect(sh4Assignment?.isOvertime).toBe(true);
  });

  it("places harder-constrained ICU shifts before Med-Surg shifts", () => {
    // Verify shift ordering by observing which shifts get filled first
    // when there's only 1 qualified ICU staff (competency ≥ 2)
    const icuStaff = makeStaff("icu-1", { icuCompetencyLevel: 2 });
    const medSurgStaff = makeStaff("ms-1", { icuCompetencyLevel: 1 });

    const icuShift = makeShift("icu-sh", "2026-02-09", { unit: "ICU", requiredStaffCount: 1 });
    const medSurgShift = makeShift("ms-sh", "2026-02-09", { unit: "Med-Surg", requiredStaffCount: 1 });

    const ctx = makeContext([medSurgShift, icuShift], [icuStaff, medSurgStaff]);
    const result = greedyConstruct(ctx, BALANCED);

    // ICU shift should be filled (with the ICU-qualified nurse)
    expect(result.assignments.some((a) => a.shiftId === "icu-sh" && a.staffId === "icu-1")).toBe(true);
    // Med-Surg should also be filled with the remaining staff
    expect(result.assignments.some((a) => a.shiftId === "ms-sh")).toBe(true);
  });

  it("produces the same count of assignments across all 3 weight profiles", () => {
    const staff = Array.from({ length: 6 }, (_, i) => makeStaff(`s${i + 1}`));
    const shifts = [
      makeShift("sh1", "2026-02-09", { requiredStaffCount: 2 }),
      makeShift("sh2", "2026-02-10", { requiredStaffCount: 2 }),
      makeShift("sh3", "2026-02-11", { requiredStaffCount: 2 }),
    ];
    const ctx = makeContext(shifts, staff);

    const balanced = greedyConstruct(ctx, BALANCED);
    const fair = greedyConstruct(ctx, FAIR);
    const cost = greedyConstruct(ctx, COST_OPTIMIZED);

    // All variants should achieve full coverage with identical staff pool
    expect(balanced.assignments).toHaveLength(6);
    expect(fair.assignments).toHaveLength(6);
    expect(cost.assignments).toHaveLength(6);
    expect(balanced.understaffed).toHaveLength(0);
    expect(fair.understaffed).toHaveLength(0);
    expect(cost.understaffed).toHaveLength(0);
  });

  it("records understaffed shift reasons", () => {
    // Force understaffing by making staff on leave
    const staff = [makeStaff("s1")];
    const shifts = [makeShift("sh1", "2026-02-09", { requiredStaffCount: 2 })];
    const ctx = makeContext(shifts, staff, {
      staffLeaves: [{ staffId: "s1", status: "approved", startDate: "2026-02-09", endDate: "2026-02-09" }],
    });
    const result = greedyConstruct(ctx, BALANCED);

    expect(result.understaffed).toHaveLength(1);
    expect(result.understaffed[0].assigned).toBe(0);
    // Reasons should mention leave
    expect(result.understaffed[0].reasons.some((r) => r.includes("leave"))).toBe(true);
  });
});
