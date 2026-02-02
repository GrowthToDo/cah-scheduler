import { db } from "@/db";
import { assignment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/logger";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: scheduleId } = await params;
  const body = await request.json();

  const newAssignment = db
    .insert(assignment)
    .values({
      shiftId: body.shiftId,
      staffId: body.staffId,
      scheduleId,
      isChargeNurse: body.isChargeNurse ?? false,
      isOvertime: body.isOvertime ?? false,
      assignmentSource: body.assignmentSource ?? "manual",
      notes: body.notes || null,
    })
    .returning()
    .get();

  logAuditEvent({
    entityType: "assignment",
    entityId: newAssignment.id,
    action: "manual_assignment",
    description: `Assigned staff ${body.staffId} to shift ${body.shiftId}`,
    newState: newAssignment as unknown as Record<string, unknown>,
  });

  return NextResponse.json(newAssignment, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const assignmentId = searchParams.get("assignmentId");

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(assignment)
    .where(eq(assignment.id, assignmentId))
    .get();

  db.delete(assignment).where(eq(assignment.id, assignmentId)).run();

  if (existing) {
    logAuditEvent({
      entityType: "assignment",
      entityId: assignmentId,
      action: "deleted",
      description: `Removed assignment of staff ${existing.staffId} from shift ${existing.shiftId}`,
      previousState: existing as unknown as Record<string, unknown>,
    });
  }

  return NextResponse.json({ success: true });
}
