import { db } from "@/db";
import { prnAvailability, staff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");
  const staffId = searchParams.get("staffId");

  let conditions = [];

  if (scheduleId) {
    conditions.push(eq(prnAvailability.scheduleId, scheduleId));
  }
  if (staffId) {
    conditions.push(eq(prnAvailability.staffId, staffId));
  }

  const query = db
    .select({
      id: prnAvailability.id,
      staffId: prnAvailability.staffId,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      scheduleId: prnAvailability.scheduleId,
      availableDates: prnAvailability.availableDates,
      notes: prnAvailability.notes,
      submittedAt: prnAvailability.submittedAt,
      createdAt: prnAvailability.createdAt,
    })
    .from(prnAvailability)
    .leftJoin(staff, eq(prnAvailability.staffId, staff.id));

  if (conditions.length > 0) {
    const results = query.where(and(...conditions)).all();
    return NextResponse.json(results);
  }

  return NextResponse.json(query.all());
}

export async function POST(request: Request) {
  const body = await request.json();

  // Check if entry already exists for this staff + schedule
  const existing = db
    .select()
    .from(prnAvailability)
    .where(
      and(
        eq(prnAvailability.staffId, body.staffId),
        eq(prnAvailability.scheduleId, body.scheduleId)
      )
    )
    .get();

  if (existing) {
    // Update existing
    const updated = db
      .update(prnAvailability)
      .set({
        availableDates: body.availableDates,
        notes: body.notes,
        submittedAt: new Date().toISOString(),
      })
      .where(eq(prnAvailability.id, existing.id))
      .returning()
      .get();

    return NextResponse.json(updated);
  }

  // Create new
  const newAvailability = db
    .insert(prnAvailability)
    .values({
      staffId: body.staffId,
      scheduleId: body.scheduleId,
      availableDates: body.availableDates ?? [],
      notes: body.notes || null,
    })
    .returning()
    .get();

  return NextResponse.json(newAvailability, { status: 201 });
}
