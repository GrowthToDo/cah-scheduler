import { db } from "@/db";
import { shiftDefinition } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const definition = db
    .select()
    .from(shiftDefinition)
    .where(eq(shiftDefinition.id, id))
    .get();

  if (!definition) {
    return NextResponse.json(
      { error: "Shift definition not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(definition);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = db
    .update(shiftDefinition)
    .set({
      name: body.name,
      shiftType: body.shiftType,
      startTime: body.startTime,
      endTime: body.endTime,
      durationHours: body.durationHours,
      unit: body.unit,
      requiredStaffCount: body.requiredStaffCount,
      requiresChargeNurse: body.requiresChargeNurse,
      countsTowardStaffing: body.countsTowardStaffing,
      isActive: body.isActive,
    })
    .where(eq(shiftDefinition.id, id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json(
      { error: "Shift definition not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(shiftDefinition).where(eq(shiftDefinition.id, id)).run();
  return NextResponse.json({ success: true });
}
