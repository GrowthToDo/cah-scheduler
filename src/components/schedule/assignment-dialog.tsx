"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  acuityLevel: "blue" | "green" | "yellow" | "red" | null;
  assignments: ShiftAssignment[];
}

interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  employmentType: string;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  reliabilityRating: number;
  isActive: boolean;
  eligible: boolean;
  alreadyAssigned: boolean;
  ineligibleReasons: string[];
  weeklyHours: number;
  standardWeeklyHours: number;
  wouldCauseOT: boolean;
  preferredShift: string | null;
  preferredDaysOff: string[];
  avoidWeekends: boolean;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  shift,
  scheduleId,
  onAssign,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftData | null;
  scheduleId: string;
  onAssign: (shiftId: string, staffId: string, isChargeNurse: boolean) => void;
  onRemove: (assignmentId: string) => void;
}) {
  const [availableStaff, setAvailableStaff] = useState<StaffOption[]>([]);
  const [assignedContext, setAssignedContext] = useState<Map<string, StaffOption>>(new Map());

  useEffect(() => {
    if (open && shift) {
      // Fetch all staff with scheduling context for this shift.
      // Already-assigned staff come back with alreadyAssigned: true — used to
      // enrich the "Currently Assigned" section with hours and preference info.
      fetch(`/api/shifts/${shift.id}/eligible-staff?scheduleId=${scheduleId}`)
        .then((r) => r.json())
        .then((staff: StaffOption[]) => {
          setAvailableStaff(staff.filter((s) => !s.alreadyAssigned));
          setAssignedContext(
            new Map(staff.filter((s) => s.alreadyAssigned).map((s) => [s.id, s]))
          );
        });
    }
  }, [open, shift, scheduleId]);

  if (!shift) return null;

  const excessCount = shift.assignments.length - shift.requiredStaffCount;
  const isOverstaffed = excessCount > 0;

  /**
   * Build a ranked flex-home recommendation list.
   * Uses context from the eligible-staff API for richer signals.
   * Never recommends the charge nurse. Returns up to `excessCount` entries.
   */
  function getFlexRecommendations(): Array<{ assignment: ShiftAssignment; reasons: string[] }> {
    if (!isOverstaffed) return [];

    const scored = shift!.assignments
      .filter((a) => !a.isChargeNurse)
      .map((a) => {
        const ctx = assignedContext.get(a.staffId);
        const reasons: string[] = [];
        let score = 0;

        if (a.isOvertime) {
          score += 100;
          reasons.push("On overtime — sending home stops OT clock");
        }
        if (ctx?.employmentType === "per_diem") {
          score += 40;
          reasons.push("PRN — flex before FTE staff");
        } else if (ctx?.employmentType === "agency") {
          score += 50;
          reasons.push("Agency — flex before permanent staff");
        }
        if (ctx && ctx.weeklyHours >= (ctx.standardWeeklyHours ?? 40)) {
          score += 30;
          reasons.push(`At FTE target (${ctx.weeklyHours}h / ${ctx.standardWeeklyHours}h)`);
        } else if (ctx) {
          score += ctx.weeklyHours; // more hours = higher priority to go home
        }
        // Lower competency = can more easily spare (higher score = flex first)
        score += (5 - a.staffCompetency) * 10;
        if (a.staffCompetency <= 2 && reasons.length === 0) {
          reasons.push(`Level ${a.staffCompetency}/5 — lower competency can be spared`);
        }

        if (reasons.length === 0 && ctx) {
          reasons.push(`${ctx.weeklyHours}h this week`);
        }

        return { assignment: a, score, reasons };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.assignment.staffLastName.localeCompare(b.assignment.staffLastName);
      });

    return scored.slice(0, excessCount).map(({ assignment, reasons }) => ({ assignment, reasons }));
  }

  const flexRecs = getFlexRecommendations();

  // A shift still "needs charge" if no VALID charge nurse (Level 4+) is assigned.
  // A Level 3 nurse with isChargeNurse=true satisfies the flag but violates the
  // hard rule, so we must not treat them as a valid charge nurse here.
  const needsCharge =
    shift.requiresChargeNurse &&
    !shift.assignments.some((a) => a.isChargeNurse && a.staffCompetency >= 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {shift.name} - {format(parseISO(shift.date), "EEE, MMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shift info */}
          <div className="flex gap-2 text-sm flex-wrap">
            <Badge variant={isOverstaffed ? "outline" : "secondary"} className={isOverstaffed ? "border-blue-400 text-blue-700" : ""}>
              {shift.assignments.length}/{shift.requiredStaffCount} staff
            </Badge>
            {needsCharge && (
              <Badge variant="destructive">Needs charge nurse</Badge>
            )}
          </div>

          {/* Census tier (read-only — set on the Census page) */}
          {shift.acuityLevel ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30 text-sm">
              <span className="font-medium">Census:</span>
              <span
                className={`inline-flex items-center gap-1.5 font-medium ${
                  shift.acuityLevel === "blue"
                    ? "text-blue-600"
                    : shift.acuityLevel === "green"
                    ? "text-green-600"
                    : shift.acuityLevel === "yellow"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    shift.acuityLevel === "blue"
                      ? "bg-blue-500"
                      : shift.acuityLevel === "green"
                      ? "bg-green-500"
                      : shift.acuityLevel === "yellow"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                />
                {shift.acuityLevel === "blue"
                  ? "Low Census"
                  : shift.acuityLevel === "green"
                  ? "Normal"
                  : shift.acuityLevel === "yellow"
                  ? "Elevated"
                  : "Critical"}
              </span>
              <a
                href="/census"
                className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
              >
                Edit on Census page
              </a>
            </div>
          ) : null}

          {/* Flex-home / VTO recommendations when overstaffed */}
          {isOverstaffed && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {excessCount} excess staff — Flex-Home / VTO Suggestions
                </span>
                <Badge className="bg-blue-500 text-white text-xs">+{excessCount} excess</Badge>
              </div>
              <div className="space-y-2">
                {flexRecs.map(({ assignment: a, reasons }, i) => (
                  <div key={a.id} className="rounded border border-blue-200 bg-white px-3 py-2 dark:border-blue-700 dark:bg-blue-900/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        {i + 1}. {a.staffFirstName} {a.staffLastName}
                      </span>
                      <Badge variant="secondary" className="text-xs">{a.staffRole}</Badge>
                      {a.isOvertime && (
                        <Badge variant="destructive" className="text-xs">OT</Badge>
                      )}
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        Level {a.staffCompetency}/5
                      </span>
                    </div>
                    <ul className="mt-0.5 ml-2">
                      {reasons.map((r, j) => (
                        <li key={j} className="text-[11px] text-blue-700 dark:text-blue-300">• {r}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-blue-600 dark:text-blue-400">
                Offer flex-home (on-call) or VTO to these staff first. Use Remove below to update the schedule if they accept.
              </p>
            </div>
          )}

          {/* Current assignments */}
          {shift.assignments.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Currently Assigned</h3>
              <div className="space-y-1">
                {shift.assignments.map((a) => {
                  const ctx = assignedContext.get(a.staffId);
                  const shiftDayName = format(parseISO(shift.date), "EEEE");
                  const isWeekend = [0, 6].includes(parseISO(shift.date).getDay());
                  const prefMismatch =
                    ctx?.preferredShift && ctx.preferredShift !== "any" && ctx.preferredShift !== shift.shiftType
                      ? `Prefers ${ctx.preferredShift}`
                      : null;
                  const dayOffMismatch =
                    ctx?.preferredDaysOff.includes(shiftDayName) ? `Prefers ${shiftDayName} off` : null;
                  const weekendMismatch = isWeekend && ctx?.avoidWeekends ? "Avoids weekends" : null;
                  const aboveFTE =
                    ctx && ctx.standardWeeklyHours < 40 && ctx.weeklyHours >= ctx.standardWeeklyHours;

                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">
                            {a.staffFirstName} {a.staffLastName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {a.staffRole}
                          </Badge>
                          {a.isChargeNurse && (
                            <Badge className="text-xs">Charge</Badge>
                          )}
                          {a.isOvertime && (
                            <Badge variant="destructive" className="text-xs">
                              OT
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Level {a.staffCompetency}/5
                          </span>
                        </div>
                        {ctx && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs ${aboveFTE ? "text-amber-600" : "text-muted-foreground"}`}>
                              {ctx.weeklyHours}h this week
                              {ctx.standardWeeklyHours < 40 && ` (${ctx.standardWeeklyHours}h FTE target)`}
                            </span>
                            {prefMismatch && (
                              <span className="text-xs text-amber-600">{prefMismatch}</span>
                            )}
                            {dayOffMismatch && (
                              <span className="text-xs text-amber-600">{dayOffMismatch}</span>
                            )}
                            {weekendMismatch && (
                              <span className="text-xs text-amber-600">{weekendMismatch}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive shrink-0 ml-2"
                        onClick={() => onRemove(a.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available staff */}
          {(() => {
            const employmentLabels: Record<string, string> = {
              full_time: "FT",
              part_time: "PT",
              per_diem: "PRN",
              float: "Float",
              agency: "Agency",
            };
            const eligible = availableStaff.filter((s) => s.eligible);
            const ineligible = availableStaff.filter((s) => !s.eligible);

            return (
              <>
                <div>
                  <h3 className="mb-2 text-sm font-medium">
                    Available Staff
                    {eligible.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {eligible.length} can be assigned
                      </span>
                    )}
                  </h3>
                  {eligible.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No staff available for this shift (all blocked by scheduling rules).
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {eligible.map((s) => {
                        // Build detail hints for the second line
                        const shiftDayName = format(parseISO(shift.date), "EEEE");
                        const isWeekend = [0, 6].includes(parseISO(shift.date).getDay());
                        const prefMismatch =
                          s.preferredShift && s.preferredShift !== "any" && s.preferredShift !== shift.shiftType
                            ? `Prefers ${s.preferredShift}`
                            : null;
                        const dayOffMismatch =
                          s.preferredDaysOff.includes(shiftDayName) ? `Prefers ${shiftDayName} off` : null;
                        const weekendMismatch = isWeekend && s.avoidWeekends ? "Avoids weekends" : null;

                        const aboveFTE =
                          s.standardWeeklyHours < 40 && s.weeklyHours >= s.standardWeeklyHours;

                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">
                                  {s.firstName} {s.lastName}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {s.role}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {employmentLabels[s.employmentType] || s.employmentType}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Level {s.icuCompetencyLevel}/5
                                </span>
                                {s.isChargeNurseQualified && (
                                  <Badge variant="outline" className="text-xs">
                                    Charge RN
                                  </Badge>
                                )}
                              </div>
                              {/* Detail line */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs ${aboveFTE ? "text-amber-600" : "text-muted-foreground"}`}>
                                  {s.weeklyHours}h this week
                                  {s.standardWeeklyHours < 40 && ` (${s.standardWeeklyHours}h FTE target)`}
                                </span>
                                {s.wouldCauseOT && (
                                  <Badge variant="destructive" className="text-xs py-0">
                                    Would OT
                                  </Badge>
                                )}
                                {prefMismatch && (
                                  <span className="text-xs text-amber-600">{prefMismatch}</span>
                                )}
                                {dayOffMismatch && (
                                  <span className="text-xs text-amber-600">{dayOffMismatch}</span>
                                )}
                                {weekendMismatch && (
                                  <span className="text-xs text-amber-600">{weekendMismatch}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0 ml-2">
                              {s.isChargeNurseQualified && s.icuCompetencyLevel >= 4 && needsCharge && (
                                <Button
                                  size="sm"
                                  onClick={() => onAssign(shift.id, s.id, true)}
                                >
                                  Assign as Charge
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onAssign(shift.id, s.id, false)}
                              >
                                Assign
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {ineligible.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                      Unavailable ({ineligible.length})
                    </h3>
                    <div className="space-y-1">
                      {ineligible.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 opacity-50"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {s.firstName} {s.lastName}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {s.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Level {s.icuCompetencyLevel}/5
                              </span>
                            </div>
                            {s.ineligibleReasons.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {s.ineligibleReasons.join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
