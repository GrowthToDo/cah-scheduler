import { db } from "@/db";
import { callout } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const c = db.select().from(callout).where(eq(callout.id, id)).get();

  if (!c) {
    return NextResponse.json({ error: "Callout not found" }, { status: 404 });
  }

  return NextResponse.json(c);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = db
    .update(callout)
    .set({
      replacementStaffId: body.replacementStaffId,
      replacementSource: body.replacementSource,
      status: body.status ?? "filled",
      resolvedAt: new Date().toISOString(),
      resolvedBy: body.resolvedBy ?? "nurse_manager",
      escalationStepsTaken: body.escalationStepsTaken,
    })
    .where(eq(callout.id, id))
    .returning()
    .get();

  if (updated) {
    logAuditEvent({
      entityType: "callout",
      entityId: id,
      action: "callout_filled",
      description: `Callout filled with replacement staff ${body.replacementStaffId} via ${body.replacementSource}`,
      newState: updated as unknown as Record<string, unknown>,
    });
  }

  return NextResponse.json(updated);
}
