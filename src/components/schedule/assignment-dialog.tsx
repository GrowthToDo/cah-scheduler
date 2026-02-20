"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ineligibleReasons: string[];
}

export function AssignmentDialog({
  open,
  onOpenChange,
  shift,
  scheduleId,
  onAssign,
  onRemove,
  onCensusChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftData | null;
  scheduleId: string;
  onAssign: (shiftId: string, staffId: string, isChargeNurse: boolean) => void;
  onRemove: (assignmentId: string) => void;
  onCensusChange?: (shiftId: string, census: number | null) => void;
}) {
  const [availableStaff, setAvailableStaff] = useState<StaffOption[]>([]);
  const [censusValue, setCensusValue] = useState<string>("");

  useEffect(() => {
    if (open && shift) {
      // Set initial census value
      setCensusValue(shift.actualCensus?.toString() ?? "");

      // Fetch staff filtered through hard rules for this specific shift
      fetch(`/api/shifts/${shift.id}/eligible-staff?scheduleId=${scheduleId}`)
        .then((r) => r.json())
        .then((staff: StaffOption[]) => {
          setAvailableStaff(staff);
        });
    }
  }, [open, shift, scheduleId]);

  async function handleCensusUpdate() {
    if (!shift || !onCensusChange) return;
    const newCensus = censusValue === "" ? null : parseInt(censusValue, 10);
    if (censusValue !== "" && isNaN(newCensus as number)) return;
    onCensusChange(shift.id, newCensus);
  }

  if (!shift) return null;

  const needsCharge =
    shift.requiresChargeNurse &&
    !shift.assignments.some((a) => a.isChargeNurse);

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
            <Badge variant="secondary">
              {shift.assignments.length}/{shift.requiredStaffCount} staff
            </Badge>
            {needsCharge && (
              <Badge variant="destructive">Needs charge nurse</Badge>
            )}
          </div>

          {/* Census input */}
          <div className="flex items-end gap-2 p-3 rounded-md border bg-muted/30">
            <div className="flex-1">
              <Label htmlFor="census" className="text-sm">Patient Census</Label>
              <Input
                id="census"
                type="number"
                min="0"
                max="50"
                placeholder="Enter patient count"
                value={censusValue}
                onChange={(e) => setCensusValue(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Census determines required staffing from census bands
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleCensusUpdate}
              disabled={!onCensusChange}
            >
              Update
            </Button>
          </div>

          {/* Current assignments */}
          {shift.assignments.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Currently Assigned</h3>
              <div className="space-y-1">
                {shift.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onRemove(a.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
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
                      {eligible.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
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
                          <div className="flex gap-1">
                            {s.isChargeNurseQualified && needsCharge && (
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
                      ))}
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
