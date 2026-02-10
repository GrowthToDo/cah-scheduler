import { db } from "@/db";
import { shift, exceptionLog } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Update shift acuity level and extra staff requirements
 * POST /api/shifts/[id]/acuity
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = db.select().from(shift).where(eq(shift.id, id)).get();

  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const updated = db
    .update(shift)
    .set({
      acuityLevel: body.acuityLevel,
      acuityExtraStaff: body.acuityExtraStaff ?? 0,
      sitterCount: body.sitterCount ?? existing.sitterCount,
    })
    .where(eq(shift.id, id))
    .returning()
    .get();

  // Log acuity change
  if (existing.acuityLevel !== body.acuityLevel) {
    db.insert(exceptionLog)
      .values({
        entityType: "shift",
        entityId: id,
        action: "acuity_changed",
        description: `Acuity changed from ${existing.acuityLevel || "none"} to ${body.acuityLevel} for shift on ${existing.date}`,
        previousState: { acuityLevel: existing.acuityLevel },
        newState: { acuityLevel: body.acuityLevel, extraStaff: body.acuityExtraStaff },
        performedBy: body.performedBy || "nurse_manager",
      })
      .run();
  }

  return NextResponse.json(updated);
}
