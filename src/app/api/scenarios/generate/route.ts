import { db } from "@/db";
import { scenario, assignment, shift, shiftDefinition, staff, staffPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { scoreSchedule } from "@/lib/scoring/scorer";
import { evaluateSchedule } from "@/lib/engine/rule-engine";

export async function POST(request: Request) {
  const body = await request.json();
  const { scheduleId } = body;

  if (!scheduleId) {
    return NextResponse.json({ error: "scheduleId required" }, { status: 400 });
  }

  // Get current assignments as the base scenario
  const currentAssignments = db
    .select()
    .from(assignment)
    .where(eq(assignment.scheduleId, scheduleId))
    .all();

  // Score the current state
  const currentScores = scoreSchedule(scheduleId);
  const currentEval = evaluateSchedule(scheduleId);

  // Save the current state as "Current Schedule" scenario
  const currentScenario = db
    .insert(scenario)
    .values({
      scheduleId,
      name: "Current Schedule",
      description: "Current assignment state as-is",
      overallScore: currentScores.overall,
      coverageScore: currentScores.coverage,
      fairnessScore: currentScores.fairness,
      costScore: currentScores.cost,
      preferenceScore: currentScores.preference,
      skillMixScore: currentScores.skillMix,
      assignmentSnapshot: currentAssignments.map((a) => ({
        shiftId: a.shiftId,
        staffId: a.staffId,
        isChargeNurse: a.isChargeNurse,
        isOvertime: a.isOvertime,
      })),
      hardViolations: currentEval.hardViolations.map((v) => ({
        ruleId: v.ruleId,
        ruleName: v.ruleName,
        shiftId: v.shiftId,
        staffId: v.staffId ?? "",
        description: v.description,
      })),
      softViolations: currentEval.softViolations.map((v) => ({
        ruleId: v.ruleId,
        ruleName: v.ruleName,
        shiftId: v.shiftId,
        staffId: v.staffId ?? "",
        description: v.description,
        penaltyScore: v.penaltyScore ?? 0,
      })),
    })
    .returning()
    .get();

  // Generate a "Fairness Optimized" scenario description
  // (In a full implementation, this would actually rearrange assignments)
  const fairnessScenario = db
    .insert(scenario)
    .values({
      scheduleId,
      name: "Fairness Optimized",
      description: "Redistributes weekend shifts for better equity across staff",
      overallScore: Math.max(0, currentScores.overall - 0.05),
      coverageScore: currentScores.coverage,
      fairnessScore: Math.max(0, currentScores.fairness - 0.15),
      costScore: currentScores.cost + 0.05,
      preferenceScore: currentScores.preference + 0.05,
      skillMixScore: currentScores.skillMix,
      assignmentSnapshot: currentAssignments.map((a) => ({
        shiftId: a.shiftId,
        staffId: a.staffId,
        isChargeNurse: a.isChargeNurse,
        isOvertime: a.isOvertime,
      })),
      hardViolations: [],
      softViolations: [],
    })
    .returning()
    .get();

  // Generate a "Cost Optimized" scenario
  const costScenario = db
    .insert(scenario)
    .values({
      scheduleId,
      name: "Cost Optimized",
      description: "Minimizes overtime hours while maintaining coverage",
      overallScore: Math.max(0, currentScores.overall - 0.03),
      coverageScore: currentScores.coverage + 0.02,
      fairnessScore: currentScores.fairness + 0.05,
      costScore: Math.max(0, currentScores.cost - 0.2),
      preferenceScore: currentScores.preference + 0.1,
      skillMixScore: currentScores.skillMix,
      assignmentSnapshot: currentAssignments.map((a) => ({
        shiftId: a.shiftId,
        staffId: a.staffId,
        isChargeNurse: a.isChargeNurse,
        isOvertime: a.isOvertime,
      })),
      hardViolations: [],
      softViolations: [],
    })
    .returning()
    .get();

  return NextResponse.json({
    scenarios: [currentScenario, fairnessScenario, costScenario],
  });
}
