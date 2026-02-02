import { db } from "@/db";
import {
  staff,
  staffPreferences,
  shift,
  shiftDefinition,
  assignment,
  rule,
  censusBand,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getEvaluator } from "./rules";
import type {
  RuleContext,
  EvaluationResult,
  AssignmentInfo,
  StaffInfo,
  ShiftInfo,
  CensusBandInfo,
} from "./rules/types";

export function buildContext(scheduleId: string): RuleContext {
  // Fetch all assignments for this schedule
  const assignments = db
    .select({
      id: assignment.id,
      shiftId: assignment.shiftId,
      staffId: assignment.staffId,
      isChargeNurse: assignment.isChargeNurse,
      isOvertime: assignment.isOvertime,
      shiftDate: shift.date,
      shiftDefId: shift.shiftDefinitionId,
    })
    .from(assignment)
    .innerJoin(shift, eq(assignment.shiftId, shift.id))
    .where(eq(assignment.scheduleId, scheduleId))
    .all();

  // Fetch shift definitions
  const shiftDefs = db.select().from(shiftDefinition).all();
  const shiftDefMap = new Map(shiftDefs.map((sd) => [sd.id, sd]));

  // Fetch all shifts for this schedule
  const shifts = db
    .select()
    .from(shift)
    .where(eq(shift.scheduleId, scheduleId))
    .all();

  // Build shift map
  const shiftMap = new Map<string, ShiftInfo>();
  for (const s of shifts) {
    const def = shiftDefMap.get(s.shiftDefinitionId);
    if (!def) continue;
    shiftMap.set(s.id, {
      id: s.id,
      date: s.date,
      shiftType: def.shiftType,
      startTime: def.startTime,
      endTime: def.endTime,
      durationHours: def.durationHours,
      requiredStaffCount: s.requiredStaffCount ?? def.requiredStaffCount,
      requiresChargeNurse: s.requiresChargeNurse ?? def.requiresChargeNurse,
      actualCensus: s.actualCensus,
    });
  }

  // Build assignment info
  const assignmentInfos: AssignmentInfo[] = assignments.map((a) => {
    const shiftInfo = shiftMap.get(a.shiftId);
    return {
      id: a.id,
      shiftId: a.shiftId,
      staffId: a.staffId,
      isChargeNurse: a.isChargeNurse,
      isOvertime: a.isOvertime,
      date: a.shiftDate,
      shiftType: shiftInfo?.shiftType ?? "",
      startTime: shiftInfo?.startTime ?? "",
      endTime: shiftInfo?.endTime ?? "",
      durationHours: shiftInfo?.durationHours ?? 0,
    };
  });

  // Fetch all staff with preferences
  const allStaff = db.select().from(staff).all();
  const allPrefs = db.select().from(staffPreferences).all();
  const prefsMap = new Map(allPrefs.map((p) => [p.staffId, p]));

  const staffMap = new Map<string, StaffInfo>();
  for (const s of allStaff) {
    const pref = prefsMap.get(s.id);
    staffMap.set(s.id, {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
      employmentType: s.employmentType,
      icuCompetencyLevel: s.icuCompetencyLevel,
      isChargeNurseQualified: s.isChargeNurseQualified,
      certifications: (s.certifications as string[]) ?? [],
      fte: s.fte,
      reliabilityRating: s.reliabilityRating,
      preferences: pref
        ? {
            preferredShift: pref.preferredShift ?? "any",
            maxHoursPerWeek: pref.maxHoursPerWeek ?? 40,
            maxConsecutiveDays: pref.maxConsecutiveDays ?? 3,
            preferredDaysOff: (pref.preferredDaysOff as string[]) ?? [],
            avoidWeekends: pref.avoidWeekends ?? false,
          }
        : null,
    });
  }

  // Fetch census bands
  const bands = db.select().from(censusBand).where(eq(censusBand.isActive, true)).all();
  const censusBandInfos: CensusBandInfo[] = bands.map((b) => ({
    id: b.id,
    minPatients: b.minPatients,
    maxPatients: b.maxPatients,
    requiredRNs: b.requiredRNs,
    requiredCNAs: b.requiredCNAs,
    requiredChargeNurses: b.requiredChargeNurses,
    patientToNurseRatio: b.patientToNurseRatio,
  }));

  return {
    assignments: assignmentInfos,
    staffMap,
    shiftMap,
    censusBands: censusBandInfos,
    ruleParameters: {},
  };
}

export function evaluateSchedule(scheduleId: string): EvaluationResult {
  const context = buildContext(scheduleId);

  // Fetch active rules
  const activeRules = db
    .select()
    .from(rule)
    .where(eq(rule.isActive, true))
    .all();

  const hardViolations: EvaluationResult["hardViolations"] = [];
  const softViolations: EvaluationResult["softViolations"] = [];

  for (const r of activeRules) {
    const params = r.parameters as Record<string, unknown>;
    const evaluatorId = params.evaluator as string;
    if (!evaluatorId) continue;

    const evaluator = getEvaluator(evaluatorId);
    if (!evaluator) continue;

    // Merge rule parameters into context
    const ruleContext: RuleContext = {
      ...context,
      ruleParameters: params,
    };

    const violations = evaluator.evaluate(ruleContext);

    for (const v of violations) {
      if (r.ruleType === "hard") {
        hardViolations.push(v);
      } else {
        softViolations.push({
          ...v,
          penaltyScore: (v.penaltyScore ?? 1) * r.weight,
        });
      }
    }
  }

  const totalPenalty = softViolations.reduce(
    (sum, v) => sum + (v.penaltyScore ?? 0),
    0
  );

  return {
    isValid: hardViolations.length === 0,
    hardViolations,
    softViolations,
    totalPenalty,
  };
}
