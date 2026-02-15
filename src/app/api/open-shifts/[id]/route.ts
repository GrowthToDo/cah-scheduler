import { db } from "@/db";
import { openShift, assignment, shift, exceptionLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const record = db.select().from(openShift).where(eq(openShift.id, id)).get();

  if (!record) {
    return NextResponse.json({ error: "Open shift not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = db.select().from(openShift).where(eq(openShift.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Open shift not found" }, { status: 404 });
  }

  // If claiming/filling the shift
  if (body.action === "fill" && body.filledByStaffId) {
    // Get shift info to get scheduleId
    const shiftRecord = db.select().from(shift).where(eq(shift.id, existing.shiftId)).get();

    if (!shiftRecord) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    // Create new assignment for the staff filling the shift
    const newAssignment = db
      .insert(assignment)
      .values({
        shiftId: existing.shiftId,
        staffId: body.filledByStaffId,
        scheduleId: shiftRecord.scheduleId,
        isChargeNurse: body.isChargeNurse ?? false,
        isOvertime: body.isOvertime ?? false,
        assignmentSource: "manual",
        notes: `Filled from open shift (original: ${existing.originalStaffId})`,
      })
      .returning()
      .get();

    // Update open shift as filled
    const updated = db
      .update(openShift)
      .set({
        status: "filled",
        filledAt: new Date().toISOString(),
        filledByStaffId: body.filledByStaffId,
        filledByAssignmentId: newAssignment.id,
      })
      .where(eq(openShift.id, id))
      .returning()
      .get();

    // Log the fill action
    db.insert(exceptionLog)
      .values({
        entityType: "open_shift",
        entityId: id,
        action: "open_shift_filled",
        description: `Open shift filled by staff ${body.filledByStaffId}`,
        previousState: { status: existing.status },
        newState: { status: "filled", filledByStaffId: body.filledByStaffId },
        performedBy: body.performedBy || "nurse_manager",
      })
      .run();

    return NextResponse.json(updated);
  }

  // If cancelling the open shift
  if (body.action === "cancel") {
    const updated = db
      .update(openShift)
      .set({
        status: "cancelled",
        notes: body.notes || existing.notes,
      })
      .where(eq(openShift.id, id))
      .returning()
      .get();

    db.insert(exceptionLog)
      .values({
        entityType: "open_shift",
        entityId: id,
        action: "open_shift_cancelled",
        description: `Open shift cancelled`,
        previousState: { status: existing.status },
        newState: { status: "cancelled" },
        performedBy: body.performedBy || "nurse_manager",
      })
      .run();

    return NextResponse.json(updated);
  }

  // General update
  const updated = db
    .update(openShift)
    .set({
      status: body.status ?? existing.status,
      priority: body.priority ?? existing.priority,
      notes: body.notes ?? existing.notes,
    })
    .where(eq(openShift.id, id))
    .returning()
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(openShift).where(eq(openShift.id, id)).run();
  return NextResponse.json({ success: true });
}
