import { db } from "@/db";
import { staffPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params;
  const prefs = db
    .select()
    .from(staffPreferences)
    .where(eq(staffPreferences.staffId, staffId))
    .get();

  if (!prefs) {
    return NextResponse.json({ error: "Preferences not found" }, { status: 404 });
  }

  return NextResponse.json(prefs);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ staffId: string }> }
) {
  const { staffId } = await params;
  const body = await request.json();

  const existing = db
    .select()
    .from(staffPreferences)
    .where(eq(staffPreferences.staffId, staffId))
    .get();

  if (existing) {
    const updated = db
      .update(staffPreferences)
      .set({
        preferredShift: body.preferredShift,
        maxHoursPerWeek: body.maxHoursPerWeek,
        maxConsecutiveDays: body.maxConsecutiveDays,
        preferredDaysOff: body.preferredDaysOff,
        preferredPattern: body.preferredPattern,
        avoidWeekends: body.avoidWeekends,
        notes: body.notes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(staffPreferences.staffId, staffId))
      .returning()
      .get();

    return NextResponse.json(updated);
  }

  const created = db
    .insert(staffPreferences)
    .values({
      staffId,
      preferredShift: body.preferredShift,
      maxHoursPerWeek: body.maxHoursPerWeek,
      maxConsecutiveDays: body.maxConsecutiveDays,
      preferredDaysOff: body.preferredDaysOff,
      preferredPattern: body.preferredPattern,
      avoidWeekends: body.avoidWeekends,
      notes: body.notes,
    })
    .returning()
    .get();

  return NextResponse.json(created, { status: 201 });
}
