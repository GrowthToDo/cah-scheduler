import { db } from "@/db";
import { rule } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const r = db.select().from(rule).where(eq(rule.id, id)).get();

  if (!r) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(r);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = db
    .update(rule)
    .set({
      name: body.name,
      ruleType: body.ruleType,
      category: body.category,
      description: body.description,
      parameters: body.parameters,
      weight: body.weight,
      isActive: body.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(rule.id, id))
    .returning()
    .get();

  if (!updated) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.delete(rule).where(eq(rule.id, id)).run();
  return NextResponse.json({ success: true });
}
