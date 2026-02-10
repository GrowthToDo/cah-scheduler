import { db } from "@/db";
import { prnAvailability } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const availability = db
    .select()
    .from(prnAvailability)
    .where(eq(prnAvailability.id, id))
    .get();

  if (!availability) {
    return NextResponse.json(
      { error: "PRN availability not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(availability);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = db
    .update(prnAvailability)
    .set({
      availableDates: body.availableDates,
      notes: body.notes,
      submittedAt: new Date().toISOString(),
    })
    .where(eq(prnAvailability.id, id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json(
      { error: "PRN availability not found" },
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
  db.delete(prnAvailability).where(eq(prnAvailability.id, id)).run();
  return NextResponse.json({ success: true });
}
