export type StaffRole = "RN" | "LPN" | "CNA";
export type EmploymentType = "full_time" | "part_time" | "per_diem" | "float" | "agency";
export type ShiftPreference = "day" | "night" | "evening" | "any";

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
