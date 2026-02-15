import { db } from "@/db";
import { assignment, shift, publicHoliday, staffHolidayAssignment } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/logger";

/**
 * Holiday groups - maps individual holiday names to logical holiday groups.
 * Working either Christmas Eve OR Christmas Day counts as "worked Christmas".
 */
const HOLIDAY_GROUPS: Record<string, string> = {
  "Christmas Eve": "Christmas",
  "Christmas Day": "Christmas",
};

function getLogicalHolidayName(holidayName: string): string {
  return HOLIDAY_GROUPS[holidayName] ?? holidayName;
}

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
      safeHarborInvoked: body.safeHarborInvoked ?? false,
      safeHarborFormId: body.safeHarborFormId || null,
      isFloat: body.isFloat ?? false,
      floatFromUnit: body.floatFromUnit || null,
      agencyReason: body.agencyReason || null,
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

  // Track holiday assignment for annual fairness
  const shiftRecord = db.select().from(shift).where(eq(shift.id, body.shiftId)).get();
  if (shiftRecord) {
    const holidayRecord = db
      .select()
      .from(publicHoliday)
      .where(and(eq(publicHoliday.date, shiftRecord.date), eq(publicHoliday.isActive, true)))
      .get();

    if (holidayRecord) {
      const logicalHolidayName = getLogicalHolidayName(holidayRecord.name);
      const year = new Date(shiftRecord.date).getFullYear();

      // Check if we already have a record for this staff/holiday/year
      const existing = db
        .select()
        .from(staffHolidayAssignment)
        .where(
          and(
            eq(staffHolidayAssignment.staffId, body.staffId),
            eq(staffHolidayAssignment.holidayName, logicalHolidayName),
            eq(staffHolidayAssignment.year, year)
          )
        )
        .get();

      // Only insert if no existing record (to prevent duplicates for Christmas Eve/Day)
      if (!existing) {
        db.insert(staffHolidayAssignment)
          .values({
            staffId: body.staffId,
            holidayName: logicalHolidayName,
            year,
            shiftId: body.shiftId,
            assignmentId: newAssignment.id,
          })
          .run();
      }
    }
  }

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

  // Clean up holiday tracking if this was a holiday assignment
  if (existing) {
    const shiftRecord = db.select().from(shift).where(eq(shift.id, existing.shiftId)).get();
    if (shiftRecord) {
      const holidayRecord = db
        .select()
        .from(publicHoliday)
        .where(and(eq(publicHoliday.date, shiftRecord.date), eq(publicHoliday.isActive, true)))
        .get();

      if (holidayRecord) {
        const logicalHolidayName = getLogicalHolidayName(holidayRecord.name);
        const year = new Date(shiftRecord.date).getFullYear();

        // Delete the holiday tracking record
        db.delete(staffHolidayAssignment)
          .where(
            and(
              eq(staffHolidayAssignment.staffId, existing.staffId),
              eq(staffHolidayAssignment.holidayName, logicalHolidayName),
              eq(staffHolidayAssignment.year, year)
            )
          )
          .run();
      }
    }
  }

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
