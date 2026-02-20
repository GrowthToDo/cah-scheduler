import { db } from "@/db";
import { scenario } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheduleId = searchParams.get("scheduleId");

  const query = db.select().from(scenario);
  const scenarios = scheduleId
    ? query.where(eq(scenario.scheduleId, scheduleId)).all()
    : query.all();

  return NextResponse.json(scenarios);
}
