import { db } from "@/db";
import { scenario, assignment, exceptionLog } from "@/db/schema";
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

  // ── Apply scenario: replace schedule assignments with this snapshot ────────
  if (body.action === "apply") {
    const s = db.select().from(scenario).where(eq(scenario.id, id)).get();
    if (!s) {
      return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    }
    if (!s.assignmentSnapshot || s.assignmentSnapshot.length === 0) {
      return NextResponse.json({ error: "Scenario has no assignment snapshot" }, { status: 400 });
    }

    const scheduleId = s.scheduleId;
    const prevCount = db
      .select()
      .from(assignment)
      .where(eq(assignment.scheduleId, scheduleId))
      .all().length;

    // Delete current assignments
    db.delete(assignment).where(eq(assignment.scheduleId, scheduleId)).run();

    // Insert snapshot assignments
    for (const snap of s.assignmentSnapshot) {
      // Find any shift for this schedule to get scheduleId (snap only has shiftId)
      db.insert(assignment)
        .values({
          shiftId: snap.shiftId,
          staffId: snap.staffId,
          scheduleId,
          status: "assigned",
          isChargeNurse: snap.isChargeNurse,
          isOvertime: snap.isOvertime,
          assignmentSource: "scenario_applied",
        })
        .run();
    }

    // Mark this scenario as selected, others as rejected
    const allScenarios = db
      .select()
      .from(scenario)
      .where(eq(scenario.scheduleId, scheduleId))
      .all();

    for (const other of allScenarios) {
      db.update(scenario)
        .set({ status: other.id === id ? "selected" : "rejected" })
        .where(eq(scenario.id, other.id))
        .run();
    }

    // Audit entry
    db.insert(exceptionLog)
      .values({
        entityType: "scenario",
        entityId: id,
        action: "scenario_applied",
        description: `Scenario "${s.name}" applied to schedule: replaced ${prevCount} assignments with ${s.assignmentSnapshot.length}`,
        previousState: { assignmentCount: prevCount },
        newState: { assignmentCount: s.assignmentSnapshot.length, scenarioName: s.name },
        performedBy: "nurse_manager",
      })
      .run();

    return NextResponse.json({ success: true, assignmentsApplied: s.assignmentSnapshot.length });
  }

  // ── Status update (select / reject) ────────────────────────────────────────
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
