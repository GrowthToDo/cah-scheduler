import { db } from "@/db";
import { scenario } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/audit/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const s = db.select().from(scenario).where(eq(scenario.id, id)).get();

  if (!s) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  return NextResponse.json(s);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = db
    .update(scenario)
    .set({ status: body.status })
    .where(eq(scenario.id, id))
    .returning()
    .get();

  if (updated) {
    logAuditEvent({
      entityType: "scenario",
      entityId: id,
      action: body.status === "selected" ? "scenario_selected" : "scenario_rejected",
      description: `Scenario "${updated.name}" ${body.status}`,
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(scenario).where(eq(scenario.id, id)).run();
  return NextResponse.json({ success: true });
}
