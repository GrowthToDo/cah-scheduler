import { db } from "@/db";
import { schedule } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const schedules = db
    .select()
    .from(schedule)
    .orderBy(schedule.startDate)
    .all();
  return NextResponse.json(schedules);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newSchedule = db
    .insert(schedule)
    .values({
      name: body.name,
      startDate: body.startDate,
      endDate: body.endDate,
      unit: body.unit ?? "ICU",
      status: "draft",
      notes: body.notes || null,
    })
    .returning()
    .get();

  return NextResponse.json(newSchedule, { status: 201 });
}
