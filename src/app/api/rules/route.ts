import { db } from "@/db";
import { rule } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const allRules = db.select().from(rule).orderBy(rule.ruleType, rule.name).all();
  return NextResponse.json(allRules);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newRule = db
    .insert(rule)
    .values({
      name: body.name,
      ruleType: body.ruleType,
      category: body.category,
      description: body.description || null,
      parameters: body.parameters ?? {},
      weight: body.weight ?? 1.0,
      isActive: body.isActive ?? true,
    })
    .returning()
    .get();

  return NextResponse.json(newRule, { status: 201 });
}
