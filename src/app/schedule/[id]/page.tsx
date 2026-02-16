"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleGrid } from "@/components/schedule/schedule-grid";
import { AssignmentDialog } from "@/components/schedule/assignment-dialog";
import { ShiftViolationsModal } from "@/components/schedule/shift-violations-modal";
import { format, parseISO } from "date-fns";

interface ShiftAssignment {
  id: string;
  staffId: string;
  isChargeNurse: boolean;
  isOvertime: boolean;
  staffFirstName: string;
  staffLastName: string;
  staffRole: string;
  staffCompetency: number;
}

interface ShiftData {
  id: string;
  date: string;
  shiftType: string;
  name: string;
  requiredStaffCount: number;
  requiresChargeNurse: boolean;
  actualCensus: number | null;
  assignments: ShiftAssignment[];
}

interface ScheduleData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  unit: string;
  status: string;
  shifts: ShiftData[];
}

interface RuleViolation {
  ruleId: string;
  ruleName: string;
  ruleType: "hard" | "soft";
  shiftId: string;
  staffId?: string;
  description: string;
  penaltyScore?: number;
}

interface EvalResult {
  isValid: boolean;
  hardViolations: RuleViolation[];
  softViolations: RuleViolation[];
  totalPenalty: number;
}

export default function ScheduleBuilderPage() {
  const params = useParams();
  const scheduleId = params.id as string;

  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [violationsModalOpen, setViolationsModalOpen] = useState(false);
  const [selectedShiftForViolations, setSelectedShiftForViolations] = useState<ShiftData | null>(null);
  const [selectedViolations, setSelectedViolations] = useState<RuleViolation[]>([]);

  const fetchSchedule = useCallback(async () => {
    const res = await fetch(`/api/schedules/${scheduleId}`);
    const data = await res.json();
    setSchedule(data);
    setLoading(false);
  }, [scheduleId]);

  const runEvaluation = useCallback(async () => {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId }),
    });
    const data = await res.json();
    setEvaluation(data);
  }, [scheduleId]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useEffect(() => {
    if (schedule) {
      runEvaluation();
    }
  }, [schedule, runEvaluation]);

  async function handleAssign(shiftId: string, staffId: string, isChargeNurse: boolean) {
    await fetch(`/api/schedules/${scheduleId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftId, staffId, isChargeNurse }),
    });
    setDialogOpen(false);
    setSelectedShift(null);
    fetchSchedule();
  }

  async function handleRemove(assignmentId: string) {
    await fetch(
      `/api/schedules/${scheduleId}/assignments?assignmentId=${assignmentId}`,
      { method: "DELETE" }
    );
    setDialogOpen(false);
    setSelectedShift(null);
    fetchSchedule();
  }

  async function handleCensusChange(shiftId: string, census: number | null) {
    await fetch(`/api/shifts/${shiftId}/acuity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualCensus: census }),
    });
    fetchSchedule();
  }

  function handleShiftClick(shift: ShiftData) {
    setSelectedShift(shift);
    setDialogOpen(true);
  }

  function handleViolationsClick(shift: ShiftData, violations: RuleViolation[]) {
    setSelectedShiftForViolations(shift);
    setSelectedViolations(violations);
    setViolationsModalOpen(true);
  }

  if (loading || !schedule) {
    return <p className="text-muted-foreground">Loading schedule...</p>;
  }

  // Build violations map for the grid
  const violationMap = new Map<string, string[]>();
  const violationDetailsMap = new Map<string, RuleViolation[]>();
  if (evaluation) {
    for (const v of evaluation.hardViolations) {
      if (v.shiftId) {
        const list = violationMap.get(v.shiftId) ?? [];
        list.push(v.description);
        violationMap.set(v.shiftId, list);

        const details = violationDetailsMap.get(v.shiftId) ?? [];
        details.push({ ...v, ruleType: "hard" });
        violationDetailsMap.set(v.shiftId, details);
      }
    }
    for (const v of evaluation.softViolations) {
      if (v.shiftId) {
        const list = violationMap.get(v.shiftId) ?? [];
        list.push(v.description);
        violationMap.set(v.shiftId, list);

        const details = violationDetailsMap.get(v.shiftId) ?? [];
        details.push({ ...v, ruleType: "soft" });
        violationDetailsMap.set(v.shiftId, details);
      }
    }
  }

  const totalAssignments = schedule.shifts.reduce(
    (sum, s) => sum + s.assignments.length,
    0
  );
  const totalSlots = schedule.shifts.reduce(
    (sum, s) => sum + s.requiredStaffCount,
    0
  );
  const fillRate = totalSlots > 0 ? Math.round((totalAssignments / totalSlots) * 100) : 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{schedule.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(parseISO(schedule.startDate), "MMM d")} -{" "}
            {format(parseISO(schedule.endDate), "MMM d, yyyy")} | {schedule.unit}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={schedule.status === "draft" ? "secondary" : "default"}
          >
            {schedule.status}
          </Badge>
          <Button variant="outline" size="sm" onClick={runEvaluation}>
            Re-evaluate
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Fill Rate</p>
            <p className="text-2xl font-bold">{fillRate}%</p>
            <p className="text-xs text-muted-foreground">
              {totalAssignments}/{totalSlots} slots
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Hard Violations</p>
            <p
              className={`text-2xl font-bold ${
                evaluation && evaluation.hardViolations.length > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {evaluation?.hardViolations.length ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Soft Violations</p>
            <p className="text-2xl font-bold text-yellow-600">
              {evaluation?.softViolations.length ?? "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Penalty Score</p>
            <p className="text-2xl font-bold">
              {evaluation?.totalPenalty.toFixed(1) ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Violations summary */}
      {evaluation && evaluation.hardViolations.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-600">
              Hard Rule Violations ({evaluation.hardViolations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {evaluation.hardViolations.slice(0, 10).map((v, i) => (
                <li key={i} className="text-muted-foreground">
                  {v.description}
                </li>
              ))}
              {evaluation.hardViolations.length > 10 && (
                <li className="text-muted-foreground">
                  ...and {evaluation.hardViolations.length - 10} more
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Schedule grid */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleGrid
            shifts={schedule.shifts}
            onShiftClick={handleShiftClick}
            onViolationsClick={handleViolationsClick}
            violations={violationMap}
            violationDetails={violationDetailsMap}
          />
        </CardContent>
      </Card>

      {/* Assignment dialog */}
      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedShift(null);
        }}
        shift={selectedShift}
        scheduleId={scheduleId}
        onAssign={handleAssign}
        onRemove={handleRemove}
        onCensusChange={handleCensusChange}
      />

      {/* Shift violations modal */}
      <ShiftViolationsModal
        open={violationsModalOpen}
        onClose={() => {
          setViolationsModalOpen(false);
          setSelectedShiftForViolations(null);
          setSelectedViolations([]);
        }}
        shift={selectedShiftForViolations}
        violations={selectedViolations}
      />
    </div>
  );
}
