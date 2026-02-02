import { db } from "@/db";
import { staff, schedule, shift, assignment, callout, exceptionLog, shiftDefinition } from "@/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  // Active staff count
  const activeStaff = db
    .select()
    .from(staff)
    .where(eq(staff.isActive, true))
    .all();

  const totalFTE = activeStaff.reduce((sum, s) => sum + s.fte, 0);

  // Current/latest schedule
  const latestSchedule = db
    .select()
    .from(schedule)
    .orderBy(desc(schedule.startDate))
    .limit(1)
    .get();

  let understaffedShifts = 0;
  let totalShifts = 0;
  let totalAssignments = 0;
  let totalSlots = 0;

  if (latestSchedule) {
    const shifts = db
      .select({
        id: shift.id,
        requiredStaffCount: shift.requiredStaffCount,
        defRequiredStaff: shiftDefinition.requiredStaffCount,
      })
      .from(shift)
      .innerJoin(shiftDefinition, eq(shift.shiftDefinitionId, shiftDefinition.id))
      .where(eq(shift.scheduleId, latestSchedule.id))
      .all();

    totalShifts = shifts.length;

    for (const s of shifts) {
      const required = s.requiredStaffCount ?? s.defRequiredStaff;
      totalSlots += required;

      const assignmentCount = db
        .select({ cnt: count() })
        .from(assignment)
        .where(eq(assignment.shiftId, s.id))
        .get();

      const assigned = assignmentCount?.cnt ?? 0;
      totalAssignments += assigned;

      if (assigned < required) {
        understaffedShifts++;
      }
    }
  }

  // Open callouts
  const openCallouts = db
    .select()
    .from(callout)
    .where(eq(callout.status, "open"))
    .all();

  // Recent audit entries
  const recentAudit = db
    .select()
    .from(exceptionLog)
    .orderBy(desc(exceptionLog.createdAt))
    .limit(10)
    .all();

  return NextResponse.json({
    staffCount: activeStaff.length,
    totalFTE,
    scheduleInfo: latestSchedule
      ? {
          id: latestSchedule.id,
          name: latestSchedule.name,
          status: latestSchedule.status,
          startDate: latestSchedule.startDate,
          endDate: latestSchedule.endDate,
        }
      : null,
    totalShifts,
    totalAssignments,
    totalSlots,
    fillRate: totalSlots > 0 ? Math.round((totalAssignments / totalSlots) * 100) : 0,
    understaffedShifts,
    openCallouts: openCallouts.length,
    recentAudit,
  });
}
