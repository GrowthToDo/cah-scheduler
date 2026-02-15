import * as XLSX from "xlsx";

// Types for imported data
export interface StaffImport {
  firstName: string;
  lastName: string;
  role: "RN" | "LPN" | "CNA";
  employmentType: "full_time" | "part_time" | "per_diem" | "float" | "agency";
  fte: number;
  homeUnit: string | null;
  crossTrainedUnits: string[];
  icuCompetencyLevel: number;
  isChargeNurseQualified: boolean;
  reliabilityRating: number;
  email: string | null;
  phone: string | null;
  hireDate: string;
  weekendExempt: boolean;
  voluntaryFlexAvailable: boolean;
  notes: string | null;
}

export interface UnitImport {
  name: string;
  description: string | null;
  minStaffDay: number;
  minStaffNight: number;
  weekendShiftsRequired: number;
  holidayShiftsRequired: number;
}

export interface HolidayImport {
  name: string;
  date: string;
  year: number;
}

export interface ValidationError {
  sheet: string;
  row: number;
  message: string;
}

export interface ValidationWarning {
  sheet: string;
  row: number;
  message: string;
}

export interface ImportResult {
  staff: StaffImport[];
  units: UnitImport[];
  holidays: HolidayImport[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// Valid enum values
const VALID_ROLES = ["RN", "LPN", "CNA"];
const VALID_EMPLOYMENT_TYPES = ["full_time", "part_time", "per_diem", "float", "agency"];

// Helper to parse Yes/No to boolean
function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase().trim();
    return lower === "yes" || lower === "true" || lower === "1";
  }
  return false;
}

// Helper to parse number with default
function parseNumber(value: unknown, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined || value === null || value === "") return defaultValue;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  return num;
}

// Helper to parse comma-separated list
function parseCommaSeparated(value: unknown): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Helper to format date to YYYY-MM-DD
function formatDate(value: unknown): string {
  if (!value) return new Date().toISOString().split("T")[0];

  // If it's an Excel date number
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
    }
  }

  // If it's a string, try to parse it
  if (typeof value === "string") {
    const trimmed = value.trim();
    // Check if it's already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    // Try to parse other formats
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0];
    }
  }

  return new Date().toISOString().split("T")[0];
}

// Helper to normalize employment type
function normalizeEmploymentType(value: string): string {
  const lower = value.toLowerCase().trim().replace(/[\s-]/g, "_");
  // Map common variations
  const mappings: Record<string, string> = {
    "fulltime": "full_time",
    "full_time": "full_time",
    "parttime": "part_time",
    "part_time": "part_time",
    "per_diem": "per_diem",
    "perdiem": "per_diem",
    "prn": "per_diem",
    "float": "float",
    "float_pool": "float",
    "agency": "agency",
  };
  return mappings[lower] || lower;
}

// Parse Staff sheet
function parseStaffSheet(
  sheet: XLSX.WorkSheet,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): StaffImport[] {
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  const staff: StaffImport[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2; // Excel rows are 1-indexed, plus header row

    // Get values with flexible column name matching
    const firstName = String(row["First Name"] ?? row["FirstName"] ?? row["first_name"] ?? "").trim();
    const lastName = String(row["Last Name"] ?? row["LastName"] ?? row["last_name"] ?? "").trim();
    const role = String(row["Role"] ?? row["role"] ?? "").toUpperCase().trim();
    const employmentTypeRaw = String(row["Employment Type"] ?? row["EmploymentType"] ?? row["employment_type"] ?? "");
    const employmentType = normalizeEmploymentType(employmentTypeRaw);

    // Validate required fields
    if (!firstName) {
      errors.push({ sheet: "Staff", row: rowNum, message: "First Name is required" });
      return;
    }
    if (!lastName) {
      errors.push({ sheet: "Staff", row: rowNum, message: "Last Name is required" });
      return;
    }
    if (!role || !VALID_ROLES.includes(role)) {
      errors.push({ sheet: "Staff", row: rowNum, message: `Invalid Role "${role}". Must be RN, LPN, or CNA` });
      return;
    }
    if (!employmentType || !VALID_EMPLOYMENT_TYPES.includes(employmentType)) {
      errors.push({ sheet: "Staff", row: rowNum, message: `Invalid Employment Type "${employmentTypeRaw}". Must be full_time, part_time, per_diem, float, or agency` });
      return;
    }

    // Parse optional fields
    const fte = parseNumber(row["FTE"] ?? row["fte"], 1.0, 0, 1);
    const homeUnit = String(row["Home Unit"] ?? row["HomeUnit"] ?? row["home_unit"] ?? "").trim() || null;
    const crossTrainedUnits = parseCommaSeparated(row["Cross-Trained Units"] ?? row["CrossTrainedUnits"] ?? row["cross_trained_units"]);
    const competencyLevel = parseNumber(row["Competency Level"] ?? row["CompetencyLevel"] ?? row["competency_level"] ?? row["ICU Competency Level"], 3, 1, 5);
    const isChargeNurseQualified = parseBoolean(row["Charge Nurse Qualified"] ?? row["ChargeNurseQualified"] ?? row["charge_nurse_qualified"]);
    const reliabilityRating = parseNumber(row["Reliability Rating"] ?? row["ReliabilityRating"] ?? row["reliability_rating"], 3, 1, 5);
    const email = String(row["Email"] ?? row["email"] ?? "").trim() || null;
    const phone = String(row["Phone"] ?? row["phone"] ?? "").trim() || null;
    const hireDate = formatDate(row["Hire Date"] ?? row["HireDate"] ?? row["hire_date"]);
    const weekendExempt = parseBoolean(row["Weekend Exempt"] ?? row["WeekendExempt"] ?? row["weekend_exempt"]);
    const voluntaryFlexAvailable = parseBoolean(row["VTO Available"] ?? row["VTOAvailable"] ?? row["vto_available"] ?? row["Voluntary Flex Available"]);
    const notes = String(row["Notes"] ?? row["notes"] ?? "").trim() || null;

    // Add warnings for missing optional data
    if (!homeUnit) {
      warnings.push({ sheet: "Staff", row: rowNum, message: `No Home Unit specified for ${firstName} ${lastName}` });
    }

    staff.push({
      firstName,
      lastName,
      role: role as "RN" | "LPN" | "CNA",
      employmentType: employmentType as StaffImport["employmentType"],
      fte,
      homeUnit,
      crossTrainedUnits,
      icuCompetencyLevel: competencyLevel,
      isChargeNurseQualified,
      reliabilityRating,
      email,
      phone,
      hireDate,
      weekendExempt,
      voluntaryFlexAvailable,
      notes,
    });
  });

  return staff;
}

// Parse Units sheet
function parseUnitsSheet(
  sheet: XLSX.WorkSheet,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): UnitImport[] {
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  const units: UnitImport[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;

    const name = String(row["Name"] ?? row["name"] ?? row["Unit Name"] ?? "").trim();
    const description = String(row["Description"] ?? row["description"] ?? "").trim() || null;
    const minStaffDay = parseNumber(row["Min Staff Day"] ?? row["MinStaffDay"] ?? row["min_staff_day"], 0);
    const minStaffNight = parseNumber(row["Min Staff Night"] ?? row["MinStaffNight"] ?? row["min_staff_night"], 0);
    const weekendShiftsRequired = parseNumber(row["Weekend Shifts Required"] ?? row["WeekendShiftsRequired"], 3, 0);
    const holidayShiftsRequired = parseNumber(row["Holiday Shifts Required"] ?? row["HolidayShiftsRequired"], 1, 0);

    // Validate required fields
    if (!name) {
      errors.push({ sheet: "Units", row: rowNum, message: "Name is required" });
      return;
    }
    if (minStaffDay <= 0) {
      errors.push({ sheet: "Units", row: rowNum, message: "Min Staff Day must be greater than 0" });
      return;
    }
    if (minStaffNight <= 0) {
      errors.push({ sheet: "Units", row: rowNum, message: "Min Staff Night must be greater than 0" });
      return;
    }

    units.push({
      name,
      description,
      minStaffDay,
      minStaffNight,
      weekendShiftsRequired,
      holidayShiftsRequired,
    });
  });

  return units;
}

// Parse Holidays sheet
function parseHolidaysSheet(
  sheet: XLSX.WorkSheet,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): HolidayImport[] {
  const data = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
  const holidays: HolidayImport[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 2;

    const name = String(row["Name"] ?? row["name"] ?? row["Holiday Name"] ?? "").trim();
    const dateRaw = row["Date"] ?? row["date"];

    // Validate required fields
    if (!name) {
      errors.push({ sheet: "Holidays", row: rowNum, message: "Name is required" });
      return;
    }
    if (!dateRaw) {
      errors.push({ sheet: "Holidays", row: rowNum, message: "Date is required" });
      return;
    }

    const date = formatDate(dateRaw);
    const year = parseInt(date.split("-")[0], 10);

    if (isNaN(year)) {
      errors.push({ sheet: "Holidays", row: rowNum, message: `Invalid date format: ${dateRaw}` });
      return;
    }

    holidays.push({
      name,
      date,
      year,
    });
  });

  return holidays;
}

// Main parse function
export function parseExcelFile(buffer: ArrayBuffer): ImportResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Read the workbook
  const workbook = XLSX.read(buffer, { type: "array" });

  // Get sheet names
  const sheetNames = workbook.SheetNames;

  // Find sheets (case-insensitive)
  const staffSheetName = sheetNames.find((n) => n.toLowerCase() === "staff");
  const unitsSheetName = sheetNames.find((n) => n.toLowerCase() === "units");
  const holidaysSheetName = sheetNames.find((n) => n.toLowerCase() === "holidays");

  // Parse each sheet
  let staff: StaffImport[] = [];
  let units: UnitImport[] = [];
  let holidays: HolidayImport[] = [];

  if (staffSheetName) {
    staff = parseStaffSheet(workbook.Sheets[staffSheetName], errors, warnings);
  } else {
    warnings.push({ sheet: "Staff", row: 0, message: "No 'Staff' sheet found - no staff will be imported" });
  }

  if (unitsSheetName) {
    units = parseUnitsSheet(workbook.Sheets[unitsSheetName], errors, warnings);
  } else {
    warnings.push({ sheet: "Units", row: 0, message: "No 'Units' sheet found - no units will be imported" });
  }

  if (holidaysSheetName) {
    holidays = parseHolidaysSheet(workbook.Sheets[holidaysSheetName], errors, warnings);
  } else {
    warnings.push({ sheet: "Holidays", row: 0, message: "No 'Holidays' sheet found - no holidays will be imported" });
  }

  return {
    staff,
    units,
    holidays,
    errors,
    warnings,
  };
}

// Generate a sample Excel template
export function generateTemplate(): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  // Staff sheet
  const staffHeaders = [
    "First Name",
    "Last Name",
    "Role",
    "Employment Type",
    "FTE",
    "Home Unit",
    "Cross-Trained Units",
    "Competency Level",
    "Charge Nurse Qualified",
    "Reliability Rating",
    "Email",
    "Phone",
    "Hire Date",
    "Weekend Exempt",
    "VTO Available",
    "Notes",
  ];
  const staffExample = [
    "Maria",
    "Garcia",
    "RN",
    "full_time",
    "1.0",
    "ICU",
    "ER, Med-Surg",
    "4",
    "Yes",
    "5",
    "maria.garcia@hospital.com",
    "555-0101",
    "2020-01-15",
    "No",
    "No",
    "Senior charge nurse",
  ];
  const staffSheet = XLSX.utils.aoa_to_sheet([staffHeaders, staffExample]);
  XLSX.utils.book_append_sheet(workbook, staffSheet, "Staff");

  // Units sheet
  const unitsHeaders = [
    "Name",
    "Description",
    "Min Staff Day",
    "Min Staff Night",
    "Weekend Shifts Required",
    "Holiday Shifts Required",
  ];
  const unitsExample = [
    "ICU",
    "Intensive Care Unit - 12 bed critical care",
    "4",
    "3",
    "3",
    "1",
  ];
  const unitsSheet = XLSX.utils.aoa_to_sheet([unitsHeaders, unitsExample]);
  XLSX.utils.book_append_sheet(workbook, unitsSheet, "Units");

  // Holidays sheet
  const holidaysHeaders = ["Name", "Date"];
  const holidaysExamples = [
    ["New Year's Day", "2026-01-01"],
    ["Christmas Day", "2026-12-25"],
  ];
  const holidaysSheet = XLSX.utils.aoa_to_sheet([holidaysHeaders, ...holidaysExamples]);
  XLSX.utils.book_append_sheet(workbook, holidaysSheet, "Holidays");

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return buffer;
}
