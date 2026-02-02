import { evaluateSchedule } from "@/lib/engine/rule-engine";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { scheduleId } = body;

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId required" }, { status: 400 });
  }

  const result = evaluateSchedule(scheduleId);
  return NextResponse.json(result);
}
