export type ScheduleStatus = "draft" | "published" | "archived";
export type ShiftType = "day" | "night" | "evening";
export type AssignmentStatus = "assigned" | "confirmed" | "called_out" | "swapped" | "cancelled";
export type AssignmentSource = "manual" | "auto_generated" | "swap" | "callout_replacement" | "float";

export interface Schedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  unit: string;
  status: ScheduleStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ShiftDefinition {
  id: string;
  name: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
  durationHours: number;
  unit: string;
  requiredStaffCount: number;
  requiresChargeNurse: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Shift {
  id: string;
  scheduleId: string;
  shiftDefinitionId: string;
  date: string;
  requiredStaffCount: number | null;
  requiresChargeNurse: boolean | null;
  actualCensus: number | null;
  censusBandId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Assignment {
  id: string;
  shiftId: string;
  staffId: string;
  scheduleId: string;
  status: AssignmentStatus;
  isChargeNurse: boolean;
  isOvertime: boolean;
  assignmentSource: AssignmentSource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftWithAssignments extends Shift {
  shiftDefinition: ShiftDefinition;
  assignments: (Assignment & { staff: { id: string; firstName: string; lastName: string; role: string } })[];
}
