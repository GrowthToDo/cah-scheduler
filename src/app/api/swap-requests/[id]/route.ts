import { db } from "@/db";
import { shiftSwapRequest, assignment, exceptionLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const request = db
    .select()
    .from(shiftSwapRequest)
    .where(eq(shiftSwapRequest.id, id))
    .get();

  if (!request) {
    return NextResponse.json(
      { error: "Swap request not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(request);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = db
    .select()
    .from(shiftSwapRequest)
    .where(eq(shiftSwapRequest.id, id))
    .get();

  if (!existing) {
    return NextResponse.json(
      { error: "Swap request not found" },
      { status: 404 }
    );
  }

  // If approving, perform the actual swap
  if (body.status === "approved" && existing.status !== "approved") {
    // Get the requesting assignment
    const requestingAssignment = db
      .select()
      .from(assignment)
      .where(eq(assignment.id, existing.requestingAssignmentId))
      .get();

    const targetAssignment = existing.targetAssignmentId
      ? db
          .select()
          .from(assignment)
          .where(eq(assignment.id, existing.targetAssignmentId))
          .get()
      : null;

    if (requestingAssignment && targetAssignment && existing.targetStaffId) {
      // Swap the staff IDs on the assignments
      db.update(assignment)
        .set({
          staffId: existing.targetStaffId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(assignment.id, requestingAssignment.id))
        .run();

      db.update(assignment)
        .set({
          staffId: existing.requestingStaffId,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(assignment.id, targetAssignment.id))
        .run();
    }

    // Log the swap
    db.insert(exceptionLog)
      .values({
        entityType: "swap_request",
        entityId: id,
        action: "swap_approved",
        description: `Swap approved between staff ${existing.requestingStaffId} and ${existing.targetStaffId}`,
        previousState: {
          requestingAssignmentId: existing.requestingAssignmentId,
          targetAssignmentId: existing.targetAssignmentId,
        },
        newState: { status: "approved" },
        performedBy: body.reviewedBy || "nurse_manager",
      })
      .run();
  }

  const updated = db
    .update(shiftSwapRequest)
    .set({
      targetAssignmentId: body.targetAssignmentId ?? existing.targetAssignmentId,
      targetStaffId: body.targetStaffId ?? existing.targetStaffId,
      status: body.status,
      notes: body.notes ?? existing.notes,
      validationNotes: body.validationNotes,
      denialReason: body.denialReason,
      reviewedAt: body.status !== "pending" ? new Date().toISOString() : existing.reviewedAt,
      reviewedBy: body.reviewedBy ?? existing.reviewedBy,
    })
    .where(eq(shiftSwapRequest.id, id))
    .returning()
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Only allow deletion of pending requests
  const existing = db
    .select()
    .from(shiftSwapRequest)
    .where(eq(shiftSwapRequest.id, id))
    .get();

  if (!existing) {
    return NextResponse.json(
      { error: "Swap request not found" },
      { status: 404 }
    );
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Can only delete pending swap requests" },
      { status: 400 }
    );
  }

  db.delete(shiftSwapRequest).where(eq(shiftSwapRequest.id, id)).run();
  return NextResponse.json({ success: true });
}
