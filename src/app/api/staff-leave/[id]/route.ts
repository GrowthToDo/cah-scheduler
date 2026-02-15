import { db } from "@/db";
import { staffLeave, exceptionLog, assignment, shift, schedule, unit, openShift, callout } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const leave = db.select().from(staffLeave).where(eq(staffLeave.id, id)).get();

  if (!leave) {
    return NextResponse.json({ error: "Leave not found" }, { status: 404 });
  }

  return NextResponse.json(leave);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = db
    .select()
    .from(staffLeave)
    .where(eq(staffLeave.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Leave not found" }, { status: 404 });
  }

  const updated = db
    .update(staffLeave)
    .set({
      leaveType: body.leaveType,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      notes: body.notes,
      approvedAt: body.status === "approved" ? new Date().toISOString() : existing.approvedAt,
      approvedBy: body.approvedBy ?? existing.approvedBy,
      denialReason: body.denialReason,
    })
    .where(eq(staffLeave.id, id))
    .returning()
    .get();

  // Log status change if status changed
  if (existing.status !== body.status) {
    const actionMap: Record<string, "leave_approved" | "leave_denied" | "updated"> = {
      approved: "leave_approved",
      denied: "leave_denied",
    };
    const action = actionMap[body.status] ?? "updated";

    db.insert(exceptionLog)
      .values({
        entityType: "leave",
        entityId: id,
        action,
        description: `Leave request ${body.status} for staff ${existing.staffId}`,
        previousState: { status: existing.status },
        newState: { status: body.status },
        performedBy: body.approvedBy || "nurse_manager",
      })
      .run();

    // If approved, create open shifts or callouts for affected assignments
    if (body.status === "approved") {
      await handleLeaveApproval(existing.staffId, updated!.startDate, updated!.endDate);
    }
  }

  return NextResponse.json(updated);
}

/**
 * When leave is approved, find affected assignments and create open shifts or callouts.
 * - If shift is within callout threshold days: create callout (urgent)
 * - If shift is beyond threshold: create open shift (for bidding)
 */
async function handleLeaveApproval(staffId: string, startDate: string, endDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all assignments for this staff during the leave period
  const affectedAssignments = db
    .select({
      assignmentId: assignment.id,
      shiftId: shift.id,
      shiftDate: shift.date,
      scheduleId: assignment.scheduleId,
      scheduleUnit: schedule.unit,
    })
    .from(assignment)
    .innerJoin(shift, eq(assignment.shiftId, shift.id))
    .innerJoin(schedule, eq(assignment.scheduleId, schedule.id))
    .where(
      and(
        eq(assignment.staffId, staffId),
        gte(shift.date, startDate),
        lte(shift.date, endDate),
        eq(assignment.status, "assigned")
      )
    )
    .all();

  for (const a of affectedAssignments) {
    const shiftDate = new Date(a.shiftDate);
    const daysUntilShift = Math.ceil((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Get unit config for threshold
    const unitConfig = db
      .select()
      .from(unit)
      .where(eq(unit.name, a.scheduleUnit))
      .get();

    const calloutThreshold = unitConfig?.calloutThresholdDays ?? 7;

    // Update assignment status to cancelled
    db.update(assignment)
      .set({
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(assignment.id, a.assignmentId))
      .run();

    if (daysUntilShift <= calloutThreshold) {
      // Create callout (urgent - within threshold)
      db.insert(callout)
        .values({
          assignmentId: a.assignmentId,
          staffId: staffId,
          shiftId: a.shiftId,
          reason: "other",
          reasonDetail: "Leave approved - urgent replacement needed",
          status: "open",
        })
        .run();

      // Log the callout creation
      db.insert(exceptionLog)
        .values({
          entityType: "callout",
          entityId: a.assignmentId,
          action: "callout_logged",
          description: `Callout created due to approved leave for staff ${staffId}, shift on ${a.shiftDate}`,
          performedBy: "system",
        })
        .run();
    } else {
      // Create open shift (for bidding - beyond threshold)
      db.insert(openShift)
        .values({
          shiftId: a.shiftId,
          originalStaffId: staffId,
          originalAssignmentId: a.assignmentId,
          reason: "leave_approved",
          reasonDetail: `Leave approved - shift available for pickup`,
          status: "open",
          priority: daysUntilShift > 14 ? "low" : "normal",
        })
        .run();

      // Log the open shift creation
      db.insert(exceptionLog)
        .values({
          entityType: "open_shift",
          entityId: a.shiftId,
          action: "open_shift_created",
          description: `Open shift created due to approved leave for staff ${staffId}, shift on ${a.shiftDate}`,
          performedBy: "system",
        })
        .run();
    }
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(staffLeave).where(eq(staffLeave.id, id)).run();
  return NextResponse.json({ success: true });
}
