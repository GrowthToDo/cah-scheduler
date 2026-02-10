import { db } from "@/db";
import { publicHoliday } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");

  let query = db.select().from(publicHoliday);

  if (year) {
    const holidays = query
      .where(eq(publicHoliday.year, parseInt(year)))
      .orderBy(publicHoliday.date)
      .all();
    return NextResponse.json(holidays);
  }

  const holidays = query.orderBy(publicHoliday.date).all();
  return NextResponse.json(holidays);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newHoliday = db
    .insert(publicHoliday)
    .values({
      name: body.name,
      date: body.date,
      year: body.year ?? new Date(body.date).getFullYear(),
    })
    .returning()
    .get();

  return NextResponse.json(newHoliday, { status: 201 });
}
