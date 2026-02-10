import { db } from "@/db";
import { staff, staffPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const member = db.select().from(staff).where(eq(staff.id, id)).get();

  if (!member) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const prefs = db
    .select()
    .from(staffPreferences)
    .where(eq(staffPreferences.staffId, id))
    .get();

  return NextResponse.json({ ...member, preferences: prefs || null });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = db
    .update(staff)
    .set({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      role: body.role,
      employmentType: body.employmentType,
      fte: body.fte,
      hireDate: body.hireDate,
      icuCompetencyLevel: body.icuCompetencyLevel,
      isChargeNurseQualified: body.isChargeNurseQualified,
      certifications: body.certifications,
      reliabilityRating: body.reliabilityRating,
      homeUnit: body.homeUnit,
      crossTrainedUnits: body.crossTrainedUnits,
      weekendExempt: body.weekendExempt,
      flexHoursYearToDate: body.flexHoursYearToDate,
      isActive: body.isActive,
      notes: body.notes,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(staff.id, id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(staff).where(eq(staff.id, id)).run();
  return NextResponse.json({ success: true });
}
