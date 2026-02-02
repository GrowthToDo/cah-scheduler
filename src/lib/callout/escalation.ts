import { db } from "@/db";
import { staff, staffPreferences, assignment, shift, shiftDefinition } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

interface ReplacementCandidate {
  staffId: string;
  firstName: string;
  lastName: string;
  role: string;
  employmentType: string;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  reliabilityRating: number;
  source: "float" | "per_diem" | "overtime" | "agency";
  isAvailable: boolean;
  wouldBeOvertime: boolean;
}

export function getEscalationOptions(
  shiftId: string,
  excludeStaffId: string
): ReplacementCandidate[] {
  // Get the shift details
  const shiftRecord = db.select().from(shift).where(eq(shift.id, shiftId)).get();
  if (!shiftRecord) return [];

  const def = db
    .select()
    .from(shiftDefinition)
    .where(eq(shiftDefinition.id, shiftRecord.shiftDefinitionId))
    .get();
  if (!def) return [];

  // Get all active staff
  const allStaff = db
    .select()
    .from(staff)
    .where(and(eq(staff.isActive, true), ne(staff.id, excludeStaffId)))
    .all();

  // Get existing assignments for this shift
  const existingAssignments = db
    .select()
    .from(assignment)
    .where(eq(assignment.shiftId, shiftId))
    .all();
  const alreadyAssigned = new Set(existingAssignments.map((a) => a.staffId));

  // Get all assignments on the same date to check availability
  const sameDateAssignments = db
    .select({
      staffId: assignment.staffId,
      shiftId: assignment.shiftId,
    })
    .from(assignment)
    .innerJoin(shift, eq(assignment.shiftId, shift.id))
    .all()
    .filter((a) => {
      const s = db.select().from(shift).where(eq(shift.id, a.shiftId)).get();
      return s?.date === shiftRecord.date;
    });
  const busyOnDate = new Set(sameDateAssignments.map((a) => a.staffId));

  const candidates: ReplacementCandidate[] = [];

  for (const s of allStaff) {
    if (alreadyAssigned.has(s.id)) continue;

    const isAvailable = !busyOnDate.has(s.id);

    let source: ReplacementCandidate["source"];
    switch (s.employmentType) {
      case "float":
        source = "float";
        break;
      case "per_diem":
        source = "per_diem";
        break;
      case "agency":
        source = "agency";
        break;
      default:
        source = "overtime";
        break;
    }

    candidates.push({
      staffId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      employmentType: s.employmentType,
      icuCompetencyLevel: s.icuCompetencyLevel,
      isChargeNurseQualified: s.isChargeNurseQualified,
      reliabilityRating: s.reliabilityRating,
      source,
      isAvailable,
      wouldBeOvertime: source === "overtime",
    });
  }

  // Sort by escalation order: float > per_diem > overtime > agency
  // Within each group, sort by reliability then competency
  const sourceOrder: Record<string, number> = {
    float: 0,
    per_diem: 1,
    overtime: 2,
    agency: 3,
  };

  candidates.sort((a, b) => {
    // Available first
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    // Then by escalation order
    const orderDiff = sourceOrder[a.source] - sourceOrder[b.source];
    if (orderDiff !== 0) return orderDiff;
    // Then by reliability
    if (a.reliabilityRating !== b.reliabilityRating)
      return b.reliabilityRating - a.reliabilityRating;
    // Then by competency
    return b.icuCompetencyLevel - a.icuCompetencyLevel;
  });

  return candidates;
}
