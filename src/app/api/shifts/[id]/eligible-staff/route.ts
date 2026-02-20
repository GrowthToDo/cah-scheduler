import { NextResponse } from "next/server";
import { buildContext } from "@/lib/engine/rule-engine";
import { SchedulerState } from "@/lib/engine/scheduler/state";
import { passesHardRules, getRejectionReasons } from "@/lib/engine/scheduler/eligibility";
import type { SchedulerContext } from "@/lib/engine/scheduler/types";

/**
 * GET /api/shifts/[id]/eligible-staff?scheduleId=xxx
 *
 * Returns all active staff (not already on this shift) with an `eligible` flag
 * and `ineligibleReasons` array. Eligible staff are shown first, sorted by
 * charge-qualified, reliability, then competency.
 *
 * This is used by the assignment dialog so managers only see staff who can
 * actually be assigned without violating hard scheduling rules.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shiftId } = await params;
  const url = new URL(request.url);
  const scheduleId = url.searchParams.get("scheduleId");

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId is required" }, { status: 400 });
  }

  // Build full rule context — fetches staff, shifts, all assignments, PRN, leaves, etc.
  const ruleContext = buildContext(scheduleId);
  const shiftInfo = ruleContext.shiftMap.get(shiftId);

  if (!shiftInfo) {
    return NextResponse.json({ error: "Shift not found in schedule" }, { status: 404 });
  }

  // Wrap into SchedulerContext (same data, slightly different shape)
  const context: SchedulerContext = {
    scheduleId,
    shifts: [...ruleContext.shiftMap.values()],
    staffList: [...ruleContext.staffMap.values()],
    staffMap: ruleContext.staffMap,
    prnAvailability: ruleContext.prnAvailability,
    staffLeaves: ruleContext.staffLeaves,
    unitConfig: ruleContext.unitConfig,
    scheduleUnit: ruleContext.scheduleUnit,
    publicHolidays: ruleContext.publicHolidays,
  };

  // Populate SchedulerState from ALL current assignments for this schedule.
  // AssignmentInfo has all the same fields as AssignmentDraft so we can add directly.
  const state = new SchedulerState();
  for (const a of ruleContext.assignments) {
    state.addAssignment({
      shiftId: a.shiftId,
      staffId: a.staffId,
      date: a.date,
      shiftType: a.shiftType,
      startTime: a.startTime,
      endTime: a.endTime,
      durationHours: a.durationHours,
      unit: a.unit,
      isChargeNurse: a.isChargeNurse,
      isOvertime: a.isOvertime,
      isFloat: a.isFloat,
      floatFromUnit: a.floatFromUnit,
    });
  }

  // IDs of staff already on this specific shift
  const assignedToShift = new Set(
    ruleContext.assignments.filter((a) => a.shiftId === shiftId).map((a) => a.staffId)
  );

  // Evaluate each active staff member
  const results = [...ruleContext.staffMap.values()]
    .filter((s) => s.isActive && !assignedToShift.has(s.id))
    .map((s) => {
      const eligible = passesHardRules(s, shiftInfo, state, context);
      const ineligibleReasons = eligible ? [] : getRejectionReasons(s, shiftInfo, state, context);
      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.role,
        employmentType: s.employmentType,
        icuCompetencyLevel: s.icuCompetencyLevel,
        isChargeNurseQualified: s.isChargeNurseQualified,
        reliabilityRating: s.reliabilityRating,
        isActive: s.isActive,
        eligible,
        ineligibleReasons,
      };
    });

  // Sort: eligible first, then charge-qualified, reliability, competency
  results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.isChargeNurseQualified !== b.isChargeNurseQualified)
      return a.isChargeNurseQualified ? -1 : 1;
    if (a.reliabilityRating !== b.reliabilityRating)
      return b.reliabilityRating - a.reliabilityRating;
    return b.icuCompetencyLevel - a.icuCompetencyLevel;
  });

  return NextResponse.json(results);
}
