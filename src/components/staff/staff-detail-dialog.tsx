"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StaffCalendar } from "./staff-calendar";

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  employmentType: string;
  fte: number;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  homeUnit: string | null;
  isActive: boolean;
}

interface StaffPreferences {
  preferredShift: string | null;
  maxHoursPerWeek: number;
  maxConsecutiveDays: number;
  preferredDaysOff: string[];
  avoidWeekends: boolean;
  notes: string | null;
}

interface StaffDetailDialogProps {
  open: boolean;
  onClose: () => void;
  staff: Staff | null;
}

const employmentLabels: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  per_diem: "Per Diem",
  float: "Float",
  agency: "Agency",
};

const shiftLabels: Record<string, string> = {
  day: "Day Shift",
  night: "Night Shift",
  evening: "Evening Shift",
  any: "Any Shift",
};

export function StaffDetailDialog({
  open,
  onClose,
  staff,
}: StaffDetailDialogProps) {
  const [preferences, setPreferences] = useState<StaffPreferences | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);

  useEffect(() => {
    if (open && staff) {
      setLoadingPrefs(true);
      fetch(`/api/staff-preferences/${staff.id}`)
        .then((r) => r.json())
        .then((data) => {
          setPreferences(data);
          setLoadingPrefs(false);
        })
        .catch(() => {
          setPreferences(null);
          setLoadingPrefs(false);
        });
    }
  }, [open, staff]);

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {staff.firstName} {staff.lastName}
            <Badge variant={staff.role === "RN" ? "default" : staff.role === "LPN" ? "outline" : "secondary"}>
              {staff.role}
            </Badge>
            {!staff.isActive && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Staff info summary */}
        <div className="mb-4 grid grid-cols-4 gap-4 rounded-lg border p-3 text-sm">
          <div>
            <p className="text-muted-foreground">Employment</p>
            <p className="font-medium">{employmentLabels[staff.employmentType] || staff.employmentType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">FTE</p>
            <p className="font-medium">{staff.fte}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Home Unit</p>
            <p className="font-medium">{staff.homeUnit || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ICU Level</p>
            <p className="font-medium">{staff.icuCompetencyLevel}/5</p>
          </div>
          <div>
            <p className="text-muted-foreground">Charge RN</p>
            <p className="font-medium">{staff.isChargeNurseQualified ? "Yes" : "No"}</p>
          </div>
        </div>

        {/* Shift Preferences */}
        <div className="mb-4">
          <h3 className="mb-2 font-medium">Shift Preferences</h3>
          {loadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : preferences ? (
            <div className="grid grid-cols-3 gap-4 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Preferred Shift</p>
                <p className="font-medium">
                  {preferences.preferredShift
                    ? shiftLabels[preferences.preferredShift] || preferences.preferredShift
                    : "Any"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Hours/Week</p>
                <p className="font-medium">{preferences.maxHoursPerWeek}h</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Consecutive Days</p>
                <p className="font-medium">{preferences.maxConsecutiveDays} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avoid Weekends</p>
                <p className="font-medium">{preferences.avoidWeekends ? "Yes" : "No"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Preferred Days Off</p>
                <p className="font-medium">
                  {preferences.preferredDaysOff?.length > 0
                    ? preferences.preferredDaysOff.join(", ")
                    : "None specified"}
                </p>
              </div>
              {preferences.notes && (
                <div className="col-span-3">
                  <p className="text-muted-foreground">Notes</p>
                  <p className="font-medium">{preferences.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground rounded-lg border p-3">
              No preferences set for this staff member.
            </p>
          )}
        </div>

        {/* Calendar */}
        <div>
          <h3 className="mb-2 font-medium">Schedule Calendar</h3>
          <StaffCalendar staffId={staff.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
