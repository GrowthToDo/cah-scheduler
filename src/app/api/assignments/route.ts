import { db } from "@/db";
import { assignment, shift, shiftDefinition, schedule } from "@/db/schema";
import { eq, and, gte, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staffId");

  if (!staffId) {
    return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const rows = db
    .select({
      id: assignment.id,
      shiftId: assignment.shiftId,
      scheduleId: assignment.scheduleId,
      isChargeNurse: assignment.isChargeNurse,
      status: assignment.status,
      date: shift.date,
      shiftName: shiftDefinition.name,
      shiftType: shiftDefinition.shiftType,
      startTime: shiftDefinition.startTime,
      endTime: shiftDefinition.endTime,
      scheduleName: schedule.name,
    })
    .from(assignment)
    .innerJoin(shift, eq(assignment.shiftId, shift.id))
    .innerJoin(shiftDefinition, eq(shift.shiftDefinitionId, shiftDefinition.id))
    .innerJoin(schedule, eq(assignment.scheduleId, schedule.id))
    .where(
      and(
        eq(assignment.staffId, staffId),
        gte(shift.date, today),
        ne(assignment.status, "called_out"),
        ne(assignment.status, "cancelled")
      )
    )
    .orderBy(shift.date, shiftDefinition.startTime)
    .all();

  return NextResponse.json(rows);
}
