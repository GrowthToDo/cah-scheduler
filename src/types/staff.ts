export type StaffRole = "RN" | "LPN" | "CNA";
export type EmploymentType = "full_time" | "part_time" | "per_diem" | "float" | "agency";
export type ShiftPreference = "day" | "night" | "evening" | "any";
export type LeaveType = "vacation" | "sick" | "maternity" | "medical" | "personal" | "bereavement" | "other";
export type LeaveStatus = "pending" | "approved" | "denied";

// ICU Competency Levels:
// 1 = Novice/Orientee: Cannot take patient alone, must be paired with preceptor (FTE contribution = 0)
// 2 = Advanced Beginner: Can take stable Med-Surg/Swing Bed, no ICU/ER alone
// 3 = Competent (Standard): Fully functional, can take standard ICU/ER load, ACLS/PALS certified
// 4 = Proficient (Trauma Ready): TNCC certified, can handle Codes/Trauma alone until backup
// 5 = Expert (Charge/Preceptor): Qualified to be Charge Nurse, can take sickest patients, manage unit
export type CompetencyLevel = 1 | 2 | 3 | 4 | 5;

export const COMPETENCY_DESCRIPTIONS: Record<CompetencyLevel, { name: string; description: string }> = {
  1: {
    name: "Novice/Orientee",
    description: "Cannot take patient alone, must be paired with preceptor (FTE contribution = 0)",
  },
  2: {
    name: "Advanced Beginner",
    description: "Can take stable Med-Surg/Swing Bed, no ICU/ER alone",
  },
  3: {
    name: "Competent (Standard)",
    description: "Fully functional, can take standard ICU/ER load, ACLS/PALS certified",
  },
  4: {
    name: "Proficient (Trauma Ready)",
    description: "TNCC certified, can handle Codes/Trauma alone until backup",
  },
  5: {
    name: "Expert (Charge/Preceptor)",
    description: "Qualified to be Charge Nurse, can take sickest patients, manage unit",
  },
};

export interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  employmentType: EmploymentType;
  fte: number;
  hireDate: string;
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  certifications: string[];
  reliabilityRating: number;
  isActive: boolean;
  // Home unit and cross-training
  homeUnit: string | null;
  crossTrainedUnits: string[];
  // Weekend exemption - only Admin/CNO can set this
  weekendExempt: boolean;
  // Flex hours year-to-date for low census rotation fairness
  flexHoursYearToDate: number;
  // Voluntary time off - staff indicates willingness to go home during low census
  voluntaryFlexAvailable: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffPreferences {
  id: string;
  staffId: string;
  preferredShift: ShiftPreference;
  maxHoursPerWeek: number;
  maxConsecutiveDays: number;
  preferredDaysOff: string[];
  preferredPattern: string | null;
  avoidWeekends: boolean;
  notes: string | null;
  updatedAt: string;
}

export interface StaffWithPreferences extends Staff {
  preferences: StaffPreferences | null;
}

// Staff Leave tracking
export interface StaffLeave {
  id: string;
  staffId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  submittedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  denialReason: string | null;
  reason: string | null;
  notes: string | null;
  createdAt: string;
}

export interface StaffLeaveWithStaff extends StaffLeave {
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
  };
}

// PRN Availability - PRN staff submit available days, not days off
export interface PRNAvailability {
  id: string;
  staffId: string;
  scheduleId: string;
  availableDates: string[]; // Array of YYYY-MM-DD dates when available
  submittedAt: string;
  notes: string | null;
  createdAt: string;
}
