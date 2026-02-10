export type ScheduleStatus = "draft" | "published" | "archived";
export type ShiftType = "day" | "night" | "evening" | "on_call";
export type AssignmentStatus = "assigned" | "confirmed" | "called_out" | "swapped" | "cancelled" | "flexed";
export type AssignmentSource = "manual" | "auto_generated" | "swap" | "callout_replacement" | "float" | "agency_manual" | "pull_back";
export type AgencyReason = "callout" | "acuity_spike" | "vacancy";
export type AcuityLevel = "green" | "yellow" | "red";
export type SwapRequestStatus = "pending" | "approved" | "denied" | "cancelled";

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
  countsTowardStaffing: boolean; // On-call shifts don't count
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
  // Acuity level set by CNO/Manager
  acuityLevel: AcuityLevel | null;
  acuityExtraStaff: number | null;
  // Sitter count (1:1 patients)
  sitterCount: number | null;
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
  // For agency_manual assignments
  agencyReason: AgencyReason | null;
  // Safe Harbor (Texas law)
  safeHarborInvoked: boolean;
  safeHarborFormId: string | null;
  // Float tracking
  isFloat: boolean;
  floatFromUnit: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftWithAssignments extends Shift {
  shiftDefinition: ShiftDefinition;
  assignments: (Assignment & {
    staff: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
      icuCompetencyLevel: number;
      isChargeNurseQualified: boolean;
      homeUnit: string | null;
    }
  })[];
}

// Shift Swap Request
export interface ShiftSwapRequest {
  id: string;
  requestingAssignmentId: string;
  requestingStaffId: string;
  targetAssignmentId: string | null;
  targetStaffId: string | null;
  status: SwapRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  denialReason: string | null;
  validationNotes: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ShiftSwapRequestWithDetails extends ShiftSwapRequest {
  requestingStaff: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  targetStaff: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  requestingAssignment: Assignment & {
    shift: Shift & { shiftDefinition: ShiftDefinition };
  };
  targetAssignment: (Assignment & {
    shift: Shift & { shiftDefinition: ShiftDefinition };
  }) | null;
}
