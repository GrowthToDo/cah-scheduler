import { db } from "@/db";
import { shiftSwapRequest, staff, assignment, shift } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");
  const status = searchParams.get("status");

  // Get all requests
  const allRequests = db.select().from(shiftSwapRequest).all();

  // Enrich with staff and assignment details
  const enriched = allRequests.map((req) => {
    const requestor = db
      .select()
      .from(staff)
      .where(eq(staff.id, req.requestingStaffId))
      .get();
    const target = req.targetStaffId
      ? db.select().from(staff).where(eq(staff.id, req.targetStaffId)).get()
      : null;
    const requestorAssignment = db
      .select()
      .from(assignment)
      .where(eq(assignment.id, req.requestingAssignmentId))
      .get();
    const targetAssignment = req.targetAssignmentId
      ? db
          .select()
          .from(assignment)
          .where(eq(assignment.id, req.targetAssignmentId))
          .get()
      : null;

    // Get shift dates
    const requestorShift = requestorAssignment
      ? db.select().from(shift).where(eq(shift.id, requestorAssignment.shiftId)).get()
      : null;
    const targetShift = targetAssignment
      ? db.select().from(shift).where(eq(shift.id, targetAssignment.shiftId)).get()
      : null;

    return {
      ...req,
      requestor: requestor
        ? { firstName: requestor.firstName, lastName: requestor.lastName }
        : null,
      target: target
        ? { firstName: target.firstName, lastName: target.lastName }
        : null,
      requestorShiftDate: requestorShift?.date || null,
      targetShiftDate: targetShift?.date || null,
    };
  });

  // Apply filters
  let filtered = enriched;
  if (staffId) {
    filtered = filtered.filter(
      (r) => r.requestingStaffId === staffId || r.targetStaffId === staffId
    );
  }
  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  }

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newRequest = db
    .insert(shiftSwapRequest)
    .values({
      requestingAssignmentId: body.requestingAssignmentId,
      requestingStaffId: body.requestingStaffId,
      targetAssignmentId: body.targetAssignmentId || null,
      targetStaffId: body.targetStaffId || null,
      status: "pending",
      notes: body.notes || null,
    })
    .returning()
    .get();

  return NextResponse.json(newRequest, { status: 201 });
}
