import { db } from "@/db";
import * as schema from "@/db/schema";
import { NextResponse } from "next/server";
import { parseExcelFile, generateTemplate, type ImportResult } from "@/lib/import/parse-excel";
import * as XLSX from "xlsx";

// DELETE all existing data in correct order for FK constraints
function deleteAllData() {
  // Level 1: Tables with most FK dependencies
  db.delete(schema.exceptionLog).run();
  db.delete(schema.scenario).run();
  db.delete(schema.callout).run();
  db.delete(schema.shiftSwapRequest).run();
  db.delete(schema.openShift).run();

  // Level 2: Assignment and related
  db.delete(schema.assignment).run();
  db.delete(schema.staffHolidayAssignment).run();
  db.delete(schema.prnAvailability).run();
  db.delete(schema.staffLeave).run();

  // Level 3: Shift and schedule
  db.delete(schema.shift).run();
  db.delete(schema.shiftDefinition).run();
  db.delete(schema.schedule).run();

  // Level 4: Staff related
  db.delete(schema.staffPreferences).run();
  db.delete(schema.staff).run();

  // Level 5: Configuration tables
  db.delete(schema.censusBand).run();
  db.delete(schema.rule).run();
  db.delete(schema.publicHoliday).run();
  db.delete(schema.unit).run();
}

// Create default shift definitions
function createDefaultShiftDefinitions(units: string[]) {
  const unit = units[0] || "ICU";

  db.insert(schema.shiftDefinition).values({
    name: "Day Shift",
    shiftType: "day",
    startTime: "07:00",
    endTime: "19:00",
    durationHours: 12,
    unit,
    requiredStaffCount: 4,
    requiresChargeNurse: true,
    countsTowardStaffing: true,
  }).run();

  db.insert(schema.shiftDefinition).values({
    name: "Night Shift",
    shiftType: "night",
    startTime: "19:00",
    endTime: "07:00",
    durationHours: 12,
    unit,
    requiredStaffCount: 3,
    requiresChargeNurse: true,
    countsTowardStaffing: true,
  }).run();
}

// Create default rules
function createDefaultRules() {
  const rules = [
    // Hard rules
    { name: "Minimum Staff Per Shift", ruleType: "hard" as const, category: "staffing" as const, description: "Each shift must meet the minimum staff count", parameters: { evaluator: "min-staff" }, weight: 1.0 },
    { name: "Charge Nurse Required", ruleType: "hard" as const, category: "staffing" as const, description: "Shifts requiring a charge nurse must have one assigned", parameters: { evaluator: "charge-nurse" }, weight: 1.0 },
    { name: "Patient-to-Licensed-Staff Ratio", ruleType: "hard" as const, category: "staffing" as const, description: "Patient ratio must not exceed census band limit", parameters: { evaluator: "patient-ratio" }, weight: 1.0 },
    { name: "Minimum Rest Between Shifts", ruleType: "hard" as const, category: "rest" as const, description: "Staff must have minimum 10 hours rest between shifts", parameters: { evaluator: "rest-hours", minRestHours: 10 }, weight: 1.0 },
    { name: "Maximum Consecutive Days", ruleType: "hard" as const, category: "rest" as const, description: "Staff cannot work more than 5 consecutive days", parameters: { evaluator: "max-consecutive", maxConsecutiveDays: 5 }, weight: 1.0 },
    { name: "ICU Competency Minimum", ruleType: "hard" as const, category: "skill" as const, description: "Staff assigned to ICU must have competency level 2+", parameters: { evaluator: "icu-competency", minLevel: 2 }, weight: 1.0 },
    { name: "Level 1 Preceptor Required", ruleType: "hard" as const, category: "skill" as const, description: "Level 1 staff must have Level 5 preceptor on same shift", parameters: { evaluator: "level1-preceptor" }, weight: 1.0 },
    { name: "Level 2 ICU/ER Supervision", ruleType: "hard" as const, category: "skill" as const, description: "Level 2 staff in ICU/ER must have Level 4+ supervision", parameters: { evaluator: "level2-supervision" }, weight: 1.0 },
    { name: "No Overlapping Shifts", ruleType: "hard" as const, category: "rest" as const, description: "Staff cannot be assigned to overlapping shifts", parameters: { evaluator: "no-overlapping-shifts" }, weight: 1.0 },
    { name: "PRN Availability", ruleType: "hard" as const, category: "preference" as const, description: "PRN staff can only be scheduled on available days", parameters: { evaluator: "prn-availability" }, weight: 1.0 },
    { name: "Staff On Leave", ruleType: "hard" as const, category: "preference" as const, description: "Staff with approved leave cannot be scheduled", parameters: { evaluator: "staff-on-leave" }, weight: 1.0 },
    { name: "On-Call Limits", ruleType: "hard" as const, category: "rest" as const, description: "On-call limited per week and weekend per month", parameters: { evaluator: "on-call-limits" }, weight: 1.0 },
    { name: "Maximum 60 Hours in 7 Days", ruleType: "hard" as const, category: "rest" as const, description: "Staff cannot work more than 60 hours in 7 days", parameters: { evaluator: "max-hours-60", maxHours: 60 }, weight: 1.0 },
    // Soft rules
    { name: "Overtime & Extra Hours", ruleType: "soft" as const, category: "cost" as const, description: "Penalty for overtime (>40h) and extra hours", parameters: { evaluator: "overtime-v2", actualOtPenaltyWeight: 1.0, extraHoursPenaltyWeight: 0.3 }, weight: 8.0 },
    { name: "Staff Preference Match", ruleType: "soft" as const, category: "preference" as const, description: "Match staff to their preferred shifts", parameters: { evaluator: "preference-match" }, weight: 5.0 },
    { name: "Weekend Shifts Required", ruleType: "soft" as const, category: "fairness" as const, description: "Staff must work minimum weekend shifts per period", parameters: { evaluator: "weekend-count" }, weight: 7.0 },
    { name: "Consecutive Weekends Penalty", ruleType: "soft" as const, category: "fairness" as const, description: "Penalize >2 consecutive weekends", parameters: { evaluator: "consecutive-weekends" }, weight: 6.0 },
    { name: "Holiday Fairness", ruleType: "soft" as const, category: "fairness" as const, description: "Fair distribution of holiday shifts", parameters: { evaluator: "holiday-fairness" }, weight: 7.0 },
    { name: "Skill Mix Diversity", ruleType: "soft" as const, category: "skill" as const, description: "Each shift should have mix of experience levels", parameters: { evaluator: "skill-mix" }, weight: 3.0 },
    { name: "Minimize Float Assignments", ruleType: "soft" as const, category: "preference" as const, description: "Minimize floating staff to other units", parameters: { evaluator: "float-penalty" }, weight: 4.0 },
    { name: "Charge Nurse Distribution", ruleType: "soft" as const, category: "skill" as const, description: "Distribute charge nurses across shifts", parameters: { evaluator: "charge-clustering" }, weight: 4.0 },
  ];

  for (const r of rules) {
    db.insert(schema.rule).values(r).run();
  }
}

// Create default census bands for a unit
function createDefaultCensusBands(unitName: string) {
  const censusBands = [
    { name: "Low Census", unit: unitName, minPatients: 1, maxPatients: 4, requiredRNs: 2, requiredLPNs: 0, requiredCNAs: 1, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
    { name: "Normal Census", unit: unitName, minPatients: 5, maxPatients: 8, requiredRNs: 3, requiredLPNs: 1, requiredCNAs: 1, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
    { name: "High Census", unit: unitName, minPatients: 9, maxPatients: 10, requiredRNs: 4, requiredLPNs: 1, requiredCNAs: 2, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
    { name: "Critical Census", unit: unitName, minPatients: 11, maxPatients: 12, requiredRNs: 5, requiredLPNs: 1, requiredCNAs: 2, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
  ];

  for (const cb of censusBands) {
    db.insert(schema.censusBand).values(cb).run();
  }
}

// Import data from parsed Excel
function importData(data: ImportResult) {
  // 1. Import units
  for (const u of data.units) {
    db.insert(schema.unit).values({
      name: u.name,
      description: u.description,
      weekendShiftsRequired: u.weekendShiftsRequired,
      holidayShiftsRequired: u.holidayShiftsRequired,
    }).run();
  }

  // 2. Import holidays
  for (const h of data.holidays) {
    db.insert(schema.publicHoliday).values({
      name: h.name,
      date: h.date,
      year: h.year,
    }).run();
  }

  // 3. Import staff and create preferences
  for (const s of data.staff) {
    const newStaff = db.insert(schema.staff).values({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      role: s.role,
      employmentType: s.employmentType,
      fte: s.fte,
      hireDate: s.hireDate,
      icuCompetencyLevel: s.icuCompetencyLevel,
      isChargeNurseQualified: s.isChargeNurseQualified,
      certifications: [],
      reliabilityRating: s.reliabilityRating,
      homeUnit: s.homeUnit,
      crossTrainedUnits: s.crossTrainedUnits,
      weekendExempt: s.weekendExempt,
      voluntaryFlexAvailable: s.voluntaryFlexAvailable,
      notes: s.notes,
    }).returning().get();

    // Create staff preferences from imported data
    db.insert(schema.staffPreferences).values({
      staffId: newStaff.id,
      preferredShift: s.preferredShift,
      preferredDaysOff: s.preferredDaysOff,
      maxConsecutiveDays: s.maxConsecutiveDays,
      maxHoursPerWeek: s.maxHoursPerWeek,
      avoidWeekends: s.avoidWeekends,
    }).run();
  }

  // 4. Create default shift definitions
  const unitNames = data.units.map(u => u.name);
  createDefaultShiftDefinitions(unitNames);

  // 5. Create default rules
  createDefaultRules();

  // 6. Import census bands or create defaults
  if (data.censusBands && data.censusBands.length > 0) {
    // Import from Excel
    for (const cb of data.censusBands) {
      db.insert(schema.censusBand).values({
        name: cb.name,
        unit: cb.unit,
        minPatients: cb.minPatients,
        maxPatients: cb.maxPatients,
        requiredRNs: cb.requiredRNs,
        requiredLPNs: cb.requiredLPNs,
        requiredCNAs: cb.requiredCNAs,
        requiredChargeNurses: cb.requiredChargeNurses,
        patientToNurseRatio: cb.patientToNurseRatio,
      }).run();
    }
  } else if (unitNames.length > 0) {
    // Create defaults for first unit
    createDefaultCensusBands(unitNames[0]);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const action = formData.get("action") as string | null;

    // Handle template download
    if (action === "template") {
      const buffer = generateTemplate();
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": "attachment; filename=cah-scheduler-template.xlsx",
        },
      });
    }

    // Handle file upload
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { success: false, error: "File must be an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    // Read file as ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Parse Excel
    const result = parseExcelFile(buffer);

    // Check for validation-only mode
    const validateOnly = formData.get("validateOnly") === "true";
    if (validateOnly) {
      return NextResponse.json({
        success: result.errors.length === 0,
        preview: {
          staff: result.staff.length,
          units: result.units.length,
          holidays: result.holidays.length,
          censusBands: result.censusBands.length,
        },
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    // If there are errors, don't import
    if (result.errors.length > 0) {
      return NextResponse.json({
        success: false,
        errors: result.errors,
        warnings: result.warnings,
      }, { status: 400 });
    }

    // Check for minimum data
    if (result.staff.length === 0 && result.units.length === 0 && result.holidays.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No data found to import. Please ensure your Excel file has Staff, Units, or Holidays sheets with data.",
      }, { status: 400 });
    }

    // Delete all existing data
    deleteAllData();

    // Import new data
    importData(result);

    // Return success
    return NextResponse.json({
      success: true,
      imported: {
        staff: result.staff.length,
        units: result.units.length,
        holidays: result.holidays.length,
        censusBands: result.censusBands.length,
      },
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }, { status: 500 });
  }
}

// GET endpoint to export current data as Excel
export async function GET() {
  const buffer = exportCurrentData();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=cah-scheduler-data.xlsx",
    },
  });
}

// Export current database data to Excel
function exportCurrentData(): ArrayBuffer {
  // Query current data from database
  const staffData = db.select().from(schema.staff).all();
  const staffPreferencesData = db.select().from(schema.staffPreferences).all();
  const unitsData = db.select().from(schema.unit).all();
  const holidaysData = db.select().from(schema.publicHoliday).all();
  const censusBandsData = db.select().from(schema.censusBand).all();

  // Create a map of staff preferences by staffId for quick lookup
  const preferencesMap = new Map(staffPreferencesData.map(p => [p.staffId, p]));

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
    "Preferred Shift",
    "Preferred Days Off",
    "Max Consecutive Days",
    "Max Hours Per Week",
    "Avoid Weekends",
  ];

  const staffRows = staffData.map((s) => {
    const prefs = preferencesMap.get(s.id);
    return [
      s.firstName,
      s.lastName,
      s.role,
      s.employmentType,
      s.fte,
      s.homeUnit || "",
      (s.crossTrainedUnits || []).join(", "),
      s.icuCompetencyLevel,
      s.isChargeNurseQualified ? "Yes" : "No",
      s.reliabilityRating,
      s.email || "",
      s.phone || "",
      s.hireDate,
      s.weekendExempt ? "Yes" : "No",
      s.voluntaryFlexAvailable ? "Yes" : "No",
      s.notes || "",
      prefs?.preferredShift || "any",
      (prefs?.preferredDaysOff || []).join(", "),
      prefs?.maxConsecutiveDays ?? 3,
      prefs?.maxHoursPerWeek ?? 40,
      prefs?.avoidWeekends ? "Yes" : "No",
    ];
  });

  const staffSheet = XLSX.utils.aoa_to_sheet([staffHeaders, ...staffRows]);
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

  // For min staff, we'll use a default since it's not stored directly
  // The actual staffing is determined by census bands
  const unitsRows = unitsData.map((u) => [
    u.name,
    u.description || "",
    4, // Default min staff day
    3, // Default min staff night
    u.weekendShiftsRequired,
    u.holidayShiftsRequired,
  ]);

  const unitsSheet = XLSX.utils.aoa_to_sheet([unitsHeaders, ...unitsRows]);
  XLSX.utils.book_append_sheet(workbook, unitsSheet, "Units");

  // Holidays sheet
  const holidaysHeaders = ["Name", "Date"];

  const holidaysRows = holidaysData.map((h) => [
    h.name,
    h.date,
  ]);

  const holidaysSheet = XLSX.utils.aoa_to_sheet([holidaysHeaders, ...holidaysRows]);
  XLSX.utils.book_append_sheet(workbook, holidaysSheet, "Holidays");

  // Census Bands sheet
  const censusBandsHeaders = [
    "Name",
    "Unit",
    "Min Patients",
    "Max Patients",
    "Required RNs",
    "Required LPNs",
    "Required CNAs",
    "Required Charge",
    "Ratio",
  ];

  const censusBandsRows = censusBandsData.map((cb) => [
    cb.name,
    cb.unit,
    cb.minPatients,
    cb.maxPatients,
    cb.requiredRNs,
    cb.requiredLPNs,
    cb.requiredCNAs,
    cb.requiredChargeNurses,
    cb.patientToNurseRatio,
  ]);

  const censusBandsSheet = XLSX.utils.aoa_to_sheet([censusBandsHeaders, ...censusBandsRows]);
  XLSX.utils.book_append_sheet(workbook, censusBandsSheet, "Census Bands");

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return buffer;
}
