import { db } from "@/db";
import { unit } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  const allUnits = db.select().from(unit).orderBy(unit.name).all();
  return NextResponse.json(allUnits);
}

export async function POST(request: Request) {
  const body = await request.json();

  const newUnit = db
    .insert(unit)
    .values({
      name: body.name,
      description: body.description || null,
      weekendRuleType: body.weekendRuleType ?? "count_per_period",
      weekendShiftsRequired: body.weekendShiftsRequired ?? 3,
      schedulePeriodWeeks: body.schedulePeriodWeeks ?? 6,
      holidayShiftsRequired: body.holidayShiftsRequired ?? 1,
      escalationSequence: body.escalationSequence ?? [
        "float",
        "per_diem",
        "overtime",
        "agency",
      ],
      acuityYellowExtraStaff: body.acuityYellowExtraStaff ?? 1,
      acuityRedExtraStaff: body.acuityRedExtraStaff ?? 2,
      lowCensusOrder: body.lowCensusOrder ?? [
        "agency",
        "overtime",
        "per_diem",
        "full_time",
      ],
      otApprovalThreshold: body.otApprovalThreshold ?? 4,
      maxOnCallPerWeek: body.maxOnCallPerWeek ?? 1,
      maxOnCallWeekendsPerMonth: body.maxOnCallWeekendsPerMonth ?? 1,
      maxConsecutiveWeekends: body.maxConsecutiveWeekends ?? 2,
    })
    .returning()
    .get();

  return NextResponse.json(newUnit, { status: 201 });
}
