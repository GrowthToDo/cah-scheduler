import { db } from "@/db";
import { shiftDefinition } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const definitions = db
    .select()
    .from(shiftDefinition)
    .orderBy(shiftDefinition.name)
    .all();
  return NextResponse.json(definitions);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newDefinition = db
    .insert(shiftDefinition)
    .values({
      name: body.name,
      shiftType: body.shiftType,
      startTime: body.startTime,
      endTime: body.endTime,
      durationHours: body.durationHours,
      unit: body.unit ?? "ICU",
      requiredStaffCount: body.requiredStaffCount ?? 2,
      requiresChargeNurse: body.requiresChargeNurse ?? false,
      countsTowardStaffing: body.countsTowardStaffing ?? true,
    })
    .returning()
    .get();

  return NextResponse.json(newDefinition, { status: 201 });
}
