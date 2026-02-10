import { db } from "@/db";
import { staffLeave, exceptionLog } from "@/db/schema";
import { eq } from "drizzle-orm";
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
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(staffLeave).where(eq(staffLeave.id, id)).run();
  return NextResponse.json({ success: true });
}
