import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { addDays, format } from "date-fns";

const dbPath = path.join(process.cwd(), "cah-scheduler.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

function uuid() {
  return crypto.randomUUID();
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (in correct order for foreign keys)
  sqlite.exec(`
    DELETE FROM exception_log;
    DELETE FROM scenario;
    DELETE FROM callout;
    DELETE FROM shift_swap_request;
    DELETE FROM assignment;
    DELETE FROM shift;
    DELETE FROM schedule;
    DELETE FROM prn_availability;
    DELETE FROM staff_leave;
    DELETE FROM rule;
    DELETE FROM census_band;
    DELETE FROM shift_definition;
    DELETE FROM staff_preferences;
    DELETE FROM staff;
    DELETE FROM public_holiday;
    DELETE FROM unit;
  `);

  // ============================================================
  // UNIT CONFIGURATION
  // ============================================================
  const icuUnitId = uuid();
  db.insert(schema.unit).values({
    id: icuUnitId,
    name: "ICU",
    description: "Intensive Care Unit",
    weekendRuleType: "count_per_period",
    weekendShiftsRequired: 3, // per 6-week schedule
    schedulePeriodWeeks: 6,
    holidayShiftsRequired: 1,
    escalationSequence: ["float", "per_diem", "overtime", "agency"],
    acuityYellowExtraStaff: 1,
    acuityRedExtraStaff: 2,
    lowCensusOrder: ["agency", "overtime", "per_diem", "full_time"],
    otApprovalThreshold: 4,
    maxOnCallPerWeek: 1,
    maxOnCallWeekendsPerMonth: 1,
    maxConsecutiveWeekends: 2,
  }).run();

  const erUnitId = uuid();
  db.insert(schema.unit).values({
    id: erUnitId,
    name: "ER",
    description: "Emergency Room",
    weekendRuleType: "count_per_period",
    weekendShiftsRequired: 3,
    schedulePeriodWeeks: 6,
    holidayShiftsRequired: 1,
    escalationSequence: ["float", "per_diem", "overtime", "agency"],
    acuityYellowExtraStaff: 1,
    acuityRedExtraStaff: 2,
    lowCensusOrder: ["agency", "overtime", "per_diem", "full_time"],
    otApprovalThreshold: 4,
    maxOnCallPerWeek: 1,
    maxOnCallWeekendsPerMonth: 1,
    maxConsecutiveWeekends: 2,
  }).run();

  console.log("  Created 2 unit configurations");

  // ============================================================
  // PUBLIC HOLIDAYS (2026)
  // ============================================================
  const holidays = [
    { name: "New Year's Day", date: "2026-01-01", year: 2026 },
    { name: "Martin Luther King Jr. Day", date: "2026-01-19", year: 2026 },
    { name: "Presidents' Day", date: "2026-02-16", year: 2026 },
    { name: "Memorial Day", date: "2026-05-25", year: 2026 },
    { name: "Independence Day", date: "2026-07-04", year: 2026 },
    { name: "Labor Day", date: "2026-09-07", year: 2026 },
    { name: "Thanksgiving", date: "2026-11-26", year: 2026 },
    { name: "Christmas Eve", date: "2026-12-24", year: 2026 },
    { name: "Christmas Day", date: "2026-12-25", year: 2026 },
  ];

  for (const h of holidays) {
    db.insert(schema.publicHoliday).values({ id: uuid(), ...h }).run();
  }
  console.log(`  Created ${holidays.length} public holidays`);

  // ============================================================
  // STAFF (15 nurses with new fields)
  // ICU Competency Levels:
  // 1 = Novice/Orientee, 2 = Advanced Beginner, 3 = Competent
  // 4 = Proficient (Trauma Ready), 5 = Expert (Charge/Preceptor)
  // ============================================================
  const staffData = [
    // Full-time RNs
    { id: uuid(), firstName: "Maria", lastName: "Garcia", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2019-03-15", icuCompetencyLevel: 5, isChargeNurseQualified: true, reliabilityRating: 5, certifications: ["CCRN", "BLS", "ACLS", "TNCC"], email: "maria.garcia@cah.local", phone: "512-555-0101", homeUnit: "ICU", crossTrainedUnits: ["ER"], weekendExempt: false },
    { id: uuid(), firstName: "James", lastName: "Wilson", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2020-06-01", icuCompetencyLevel: 4, isChargeNurseQualified: true, reliabilityRating: 4, certifications: ["CCRN", "BLS", "ACLS", "TNCC"], email: "james.wilson@cah.local", phone: "512-555-0102", homeUnit: "ICU", crossTrainedUnits: ["ER"], weekendExempt: false },
    { id: uuid(), firstName: "Sarah", lastName: "Chen", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2021-01-10", icuCompetencyLevel: 4, isChargeNurseQualified: false, reliabilityRating: 4, certifications: ["BLS", "ACLS", "PALS"], email: "sarah.chen@cah.local", phone: "512-555-0103", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Michael", lastName: "Brown", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2021-08-20", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS", "ACLS"], email: "michael.brown@cah.local", phone: "512-555-0104", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Emily", lastName: "Davis", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2022-02-14", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 4, certifications: ["BLS", "ACLS", "PALS"], email: "emily.davis@cah.local", phone: "512-555-0105", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "David", lastName: "Martinez", role: "RN" as const, employmentType: "full_time" as const, fte: 0.9, hireDate: "2022-09-01", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 2, certifications: ["BLS"], email: "david.martinez@cah.local", phone: "512-555-0106", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Ashley", lastName: "Johnson", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2023-04-15", icuCompetencyLevel: 2, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS"], email: "ashley.johnson@cah.local", phone: "512-555-0107", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Robert", lastName: "Taylor", role: "RN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2024-01-08", icuCompetencyLevel: 1, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS"], email: "robert.taylor@cah.local", phone: "512-555-0108", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false, notes: "New orientee - requires preceptor" },
    // Part-time RNs
    { id: uuid(), firstName: "Lisa", lastName: "Anderson", role: "RN" as const, employmentType: "part_time" as const, fte: 0.5, hireDate: "2020-11-01", icuCompetencyLevel: 4, isChargeNurseQualified: false, reliabilityRating: 4, certifications: ["BLS", "ACLS"], email: "lisa.anderson@cah.local", phone: "512-555-0109", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Kevin", lastName: "Thomas", role: "RN" as const, employmentType: "part_time" as const, fte: 0.5, hireDate: "2021-05-20", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS"], email: "kevin.thomas@cah.local", phone: "512-555-0110", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    // LPNs (new)
    { id: uuid(), firstName: "Jessica", lastName: "Rodriguez", role: "LPN" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2022-06-01", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 4, certifications: ["LPN", "BLS"], email: "jessica.rodriguez@cah.local", phone: "512-555-0116", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    // Full-time CNAs
    { id: uuid(), firstName: "Jennifer", lastName: "White", role: "CNA" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2022-03-01", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 4, certifications: ["CNA", "BLS"], email: "jennifer.white@cah.local", phone: "512-555-0111", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Daniel", lastName: "Harris", role: "CNA" as const, employmentType: "full_time" as const, fte: 1.0, hireDate: "2023-07-15", icuCompetencyLevel: 2, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["CNA", "BLS"], email: "daniel.harris@cah.local", phone: "512-555-0112", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    // Per diem RNs
    { id: uuid(), firstName: "Patricia", lastName: "Clark", role: "RN" as const, employmentType: "per_diem" as const, fte: 0.0, hireDate: "2021-09-01", icuCompetencyLevel: 4, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS", "ACLS"], email: "patricia.clark@cah.local", phone: "512-555-0113", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    { id: uuid(), firstName: "Mark", lastName: "Lewis", role: "RN" as const, employmentType: "per_diem" as const, fte: 0.0, hireDate: "2022-12-01", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS"], email: "mark.lewis@cah.local", phone: "512-555-0114", homeUnit: "ICU", crossTrainedUnits: [], weekendExempt: false },
    // Float RN
    { id: uuid(), firstName: "Amanda", lastName: "Walker", role: "RN" as const, employmentType: "float" as const, fte: 1.0, hireDate: "2023-02-01", icuCompetencyLevel: 3, isChargeNurseQualified: false, reliabilityRating: 3, certifications: ["BLS", "ACLS"], email: "amanda.walker@cah.local", phone: "512-555-0115", homeUnit: null, crossTrainedUnits: ["ICU", "ER", "Med-Surg"], weekendExempt: false, notes: "Float pool - covers multiple units" },
  ];

  for (const s of staffData) {
    db.insert(schema.staff).values({
      id: s.id,
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
      certifications: s.certifications,
      reliabilityRating: s.reliabilityRating,
      homeUnit: s.homeUnit,
      crossTrainedUnits: s.crossTrainedUnits,
      weekendExempt: s.weekendExempt,
      flexHoursYearToDate: 0,
      notes: s.notes,
    }).run();
  }
  console.log(`  Created ${staffData.length} staff members`);

  // ============================================================
  // STAFF PREFERENCES
  // ============================================================
  const preferencesData = [
    { staffId: staffData[0].id, preferredShift: "day" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 3, preferredDaysOff: ["Sunday"], avoidWeekends: false, preferredPattern: "3on-4off" },
    { staffId: staffData[1].id, preferredShift: "day" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 4, preferredDaysOff: ["Saturday"], avoidWeekends: false, preferredPattern: "4on-3off" },
    { staffId: staffData[2].id, preferredShift: "night" as const, maxHoursPerWeek: 36, maxConsecutiveDays: 3, preferredDaysOff: ["Tuesday"], avoidWeekends: false, notes: "Attending university on Tuesdays" },
    { staffId: staffData[3].id, preferredShift: "day" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 3, preferredDaysOff: [], avoidWeekends: true, notes: "Spouse works weekends, childcare needed" },
    { staffId: staffData[4].id, preferredShift: "any" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 4, preferredDaysOff: ["Wednesday"], avoidWeekends: false },
    { staffId: staffData[5].id, preferredShift: "night" as const, maxHoursPerWeek: 36, maxConsecutiveDays: 3, preferredDaysOff: [], avoidWeekends: false, notes: "Works a second job during the day" },
    { staffId: staffData[6].id, preferredShift: "day" as const, maxHoursPerWeek: 36, maxConsecutiveDays: 3, preferredDaysOff: ["Thursday", "Friday"], avoidWeekends: false, notes: "In nursing school Thu-Fri" },
    { staffId: staffData[7].id, preferredShift: "day" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 3, preferredDaysOff: [], avoidWeekends: false, notes: "Orientee - day shifts only with preceptor" },
    { staffId: staffData[8].id, preferredShift: "day" as const, maxHoursPerWeek: 24, maxConsecutiveDays: 2, preferredDaysOff: ["Monday", "Wednesday", "Friday"], avoidWeekends: false },
    { staffId: staffData[9].id, preferredShift: "night" as const, maxHoursPerWeek: 24, maxConsecutiveDays: 2, preferredDaysOff: ["Tuesday", "Thursday", "Saturday"], avoidWeekends: false },
    { staffId: staffData[10].id, preferredShift: "day" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 4, preferredDaysOff: ["Sunday"], avoidWeekends: false },
    { staffId: staffData[11].id, preferredShift: "day" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 4, preferredDaysOff: ["Sunday"], avoidWeekends: false },
    { staffId: staffData[12].id, preferredShift: "any" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 3, preferredDaysOff: [], avoidWeekends: false },
    { staffId: staffData[13].id, preferredShift: "any" as const, maxHoursPerWeek: 24, maxConsecutiveDays: 2, preferredDaysOff: [], avoidWeekends: false, notes: "Per diem - flexible availability" },
    { staffId: staffData[14].id, preferredShift: "day" as const, maxHoursPerWeek: 24, maxConsecutiveDays: 2, preferredDaysOff: [], avoidWeekends: true, notes: "Per diem - prefers weekdays" },
    { staffId: staffData[15].id, preferredShift: "any" as const, maxHoursPerWeek: 40, maxConsecutiveDays: 4, preferredDaysOff: [], avoidWeekends: false, notes: "Float pool - covers multiple units" },
  ];

  for (const p of preferencesData) {
    db.insert(schema.staffPreferences).values(p).run();
  }
  console.log(`  Created ${preferencesData.length} staff preferences`);

  // ============================================================
  // SHIFT DEFINITIONS (Day, Night, Evening, On-Call)
  // ============================================================
  const dayShiftId = uuid();
  const nightShiftId = uuid();
  const eveningShiftId = uuid();
  const onCallShiftId = uuid();

  db.insert(schema.shiftDefinition).values({
    id: dayShiftId,
    name: "Day Shift",
    shiftType: "day",
    startTime: "07:00",
    endTime: "19:00",
    durationHours: 12,
    unit: "ICU",
    requiredStaffCount: 3,
    requiresChargeNurse: true,
    countsTowardStaffing: true,
  }).run();

  db.insert(schema.shiftDefinition).values({
    id: nightShiftId,
    name: "Night Shift",
    shiftType: "night",
    startTime: "19:00",
    endTime: "07:00",
    durationHours: 12,
    unit: "ICU",
    requiredStaffCount: 2,
    requiresChargeNurse: true,
    countsTowardStaffing: true,
  }).run();

  db.insert(schema.shiftDefinition).values({
    id: eveningShiftId,
    name: "Evening Shift",
    shiftType: "evening",
    startTime: "13:00",
    endTime: "01:00",
    durationHours: 12,
    unit: "ICU",
    requiredStaffCount: 2,
    requiresChargeNurse: true,
    countsTowardStaffing: true,
  }).run();

  db.insert(schema.shiftDefinition).values({
    id: onCallShiftId,
    name: "On-Call",
    shiftType: "on_call",
    startTime: "19:00",
    endTime: "07:00",
    durationHours: 12,
    unit: "ICU",
    requiredStaffCount: 1,
    requiresChargeNurse: false,
    countsTowardStaffing: false, // On-call doesn't count toward regular staffing
  }).run();

  console.log("  Created 4 shift definitions (Day, Night, Evening, On-Call)");

  // ============================================================
  // CENSUS BANDS (with LPNs)
  // ============================================================
  const censusBands = [
    { id: uuid(), name: "Low Census", unit: "ICU", minPatients: 1, maxPatients: 3, requiredRNs: 1, requiredLPNs: 0, requiredCNAs: 0, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
    { id: uuid(), name: "Normal Census", unit: "ICU", minPatients: 4, maxPatients: 6, requiredRNs: 2, requiredLPNs: 1, requiredCNAs: 1, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
    { id: uuid(), name: "High Census", unit: "ICU", minPatients: 7, maxPatients: 9, requiredRNs: 3, requiredLPNs: 1, requiredCNAs: 1, requiredChargeNurses: 1, patientToNurseRatio: "2:1" },
    { id: uuid(), name: "Critical Census", unit: "ICU", minPatients: 10, maxPatients: 12, requiredRNs: 4, requiredLPNs: 1, requiredCNAs: 2, requiredChargeNurses: 1, patientToNurseRatio: "1:1" },
  ];

  for (const cb of censusBands) {
    db.insert(schema.censusBand).values(cb).run();
  }
  console.log(`  Created ${censusBands.length} census bands`);

  // ============================================================
  // RULES (Hard and Soft)
  // ============================================================
  const rules = [
    // Hard rules
    { id: uuid(), name: "Minimum Staff Per Shift", ruleType: "hard" as const, category: "staffing" as const, description: "Each shift must meet the minimum staff count based on shift definition or census band", parameters: { evaluator: "min-staff" }, weight: 1.0 },
    { id: uuid(), name: "Charge Nurse Required", ruleType: "hard" as const, category: "staffing" as const, description: "Shifts requiring a charge nurse must have at least one qualified charge nurse assigned", parameters: { evaluator: "charge-nurse" }, weight: 1.0 },
    { id: uuid(), name: "Patient-to-Licensed-Staff Ratio", ruleType: "hard" as const, category: "staffing" as const, description: "Patient-to-licensed-staff (RN+LPN) ratio must not exceed the census band limit", parameters: { evaluator: "patient-ratio" }, weight: 1.0 },
    { id: uuid(), name: "Minimum Rest Between Shifts", ruleType: "hard" as const, category: "rest" as const, description: "Staff must have minimum rest hours between consecutive shifts", parameters: { evaluator: "rest-hours", minRestHours: 10 }, weight: 1.0 },
    { id: uuid(), name: "Maximum Consecutive Days", ruleType: "hard" as const, category: "rest" as const, description: "Staff cannot work more than the maximum consecutive days without a day off", parameters: { evaluator: "max-consecutive", maxConsecutiveDays: 5 }, weight: 1.0 },
    { id: uuid(), name: "ICU Competency Minimum", ruleType: "hard" as const, category: "skill" as const, description: "Staff assigned to ICU must have minimum competency level of 2", parameters: { evaluator: "icu-competency", minLevel: 2 }, weight: 1.0 },
    // New hard rules
    { id: uuid(), name: "Level 1 Preceptor Required", ruleType: "hard" as const, category: "skill" as const, description: "Level 1 (Novice) staff must have a Level 5 preceptor on the same shift", parameters: { evaluator: "level1-preceptor" }, weight: 1.0 },
    { id: uuid(), name: "Level 2 ICU/ER Supervision", ruleType: "hard" as const, category: "skill" as const, description: "Level 2 staff in ICU/ER must have Level 4+ supervision", parameters: { evaluator: "level2-supervision" }, weight: 1.0 },
    { id: uuid(), name: "No Overlapping Shifts", ruleType: "hard" as const, category: "rest" as const, description: "Staff cannot be assigned to overlapping shifts", parameters: { evaluator: "no-overlapping-shifts" }, weight: 1.0 },
    { id: uuid(), name: "PRN Availability", ruleType: "hard" as const, category: "preference" as const, description: "PRN staff can only be scheduled on days they marked as available", parameters: { evaluator: "prn-availability" }, weight: 1.0 },
    { id: uuid(), name: "Staff On Leave", ruleType: "hard" as const, category: "preference" as const, description: "Staff with approved leave cannot be scheduled during their leave period", parameters: { evaluator: "staff-on-leave" }, weight: 1.0 },
    { id: uuid(), name: "On-Call Limits", ruleType: "hard" as const, category: "rest" as const, description: "On-call assignments limited per week and weekend per month", parameters: { evaluator: "on-call-limits" }, weight: 1.0 },
    { id: uuid(), name: "Maximum 60 Hours in 7 Days", ruleType: "hard" as const, category: "rest" as const, description: "Staff cannot work more than 60 hours in any rolling 7-day period", parameters: { evaluator: "max-hours-60", maxHours: 60 }, weight: 1.0 },
    // Soft rules
    { id: uuid(), name: "Overtime & Extra Hours", ruleType: "soft" as const, category: "cost" as const, description: "High penalty for >40h (OT), low penalty for extra hours within 40h limit", parameters: { evaluator: "overtime-v2", actualOtPenaltyWeight: 1.0, extraHoursPenaltyWeight: 0.3 }, weight: 8.0 },
    { id: uuid(), name: "Staff Preference Match", ruleType: "soft" as const, category: "preference" as const, description: "Match staff assignments to their shift and day preferences", parameters: { evaluator: "preference-match" }, weight: 5.0 },
    { id: uuid(), name: "Preferred Days Off", ruleType: "soft" as const, category: "preference" as const, description: "Respect staff preferred days off when possible", parameters: { evaluator: "preference-match" }, weight: 6.0 },
    { id: uuid(), name: "Weekend Fairness (Legacy)", ruleType: "soft" as const, category: "fairness" as const, description: "Legacy weekend distribution rule", parameters: { evaluator: "weekend-fairness" }, weight: 7.0, isActive: false },
    { id: uuid(), name: "Weekend Shifts Required", ruleType: "soft" as const, category: "fairness" as const, description: "Staff must work minimum weekend shifts per schedule period", parameters: { evaluator: "weekend-count" }, weight: 7.0 },
    { id: uuid(), name: "Consecutive Weekends Penalty", ruleType: "soft" as const, category: "fairness" as const, description: "Penalize working more than 2 consecutive weekends", parameters: { evaluator: "consecutive-weekends" }, weight: 6.0 },
    { id: uuid(), name: "Holiday Fairness", ruleType: "soft" as const, category: "fairness" as const, description: "Fair distribution of holiday shifts", parameters: { evaluator: "holiday-fairness" }, weight: 7.0 },
    { id: uuid(), name: "Skill Mix Diversity", ruleType: "soft" as const, category: "skill" as const, description: "Each shift should have a mix of experience levels", parameters: { evaluator: "skill-mix" }, weight: 3.0 },
    { id: uuid(), name: "Minimize Float Assignments", ruleType: "soft" as const, category: "preference" as const, description: "Minimize floating staff to other units", parameters: { evaluator: "float-penalty" }, weight: 4.0 },
    { id: uuid(), name: "Charge Nurse Distribution", ruleType: "soft" as const, category: "skill" as const, description: "Distribute charge-qualified nurses across shifts", parameters: { evaluator: "charge-clustering" }, weight: 4.0 },
  ];

  for (const r of rules) {
    db.insert(schema.rule).values(r).run();
  }
  console.log(`  Created ${rules.length} rules`);

  // ============================================================
  // SCHEDULE (6-week period)
  // ============================================================
  const scheduleId = uuid();
  const startDate = new Date(2026, 1, 2); // Feb 2, 2026 (Monday)
  const endDate = addDays(startDate, 41); // Mar 15, 2026

  db.insert(schema.schedule).values({
    id: scheduleId,
    name: "February-March 2026",
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    unit: "ICU",
    status: "draft",
    notes: "6-week scheduling period for ICU",
  }).run();

  console.log("  Created 1 schedule period");

  // ============================================================
  // PRN AVAILABILITY (for per diem staff)
  // ============================================================
  // Patricia (per diem) - available on select days
  const patriciaAvailableDates: string[] = [];
  for (let i = 0; i < 42; i += 3) {
    patriciaAvailableDates.push(format(addDays(startDate, i), "yyyy-MM-dd"));
  }
  db.insert(schema.prnAvailability).values({
    staffId: staffData[13].id,
    scheduleId,
    availableDates: patriciaAvailableDates,
    notes: "Available every 3rd day",
  }).run();

  // Mark (per diem) - available on weekdays only
  const markAvailableDates: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(startDate, i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      markAvailableDates.push(format(d, "yyyy-MM-dd"));
    }
  }
  db.insert(schema.prnAvailability).values({
    staffId: staffData[14].id,
    scheduleId,
    availableDates: markAvailableDates,
    notes: "Available weekdays only",
  }).run();

  console.log("  Created PRN availability for 2 per diem staff");

  // ============================================================
  // SHIFTS (Day + Night per day x 42 days)
  // ============================================================
  const shiftIds: { id: string; date: string; type: "day" | "night" }[] = [];

  for (let i = 0; i < 42; i++) {
    const date = format(addDays(startDate, i), "yyyy-MM-dd");

    const dayId = uuid();
    db.insert(schema.shift).values({
      id: dayId,
      scheduleId,
      shiftDefinitionId: dayShiftId,
      date,
    }).run();
    shiftIds.push({ id: dayId, date, type: "day" });

    const nightId = uuid();
    db.insert(schema.shift).values({
      id: nightId,
      scheduleId,
      shiftDefinitionId: nightShiftId,
      date,
    }).run();
    shiftIds.push({ id: nightId, date, type: "night" });
  }

  console.log(`  Created ${shiftIds.length} shifts`);

  // ============================================================
  // SAMPLE ASSIGNMENTS (first week, partially filled)
  // ============================================================
  let assignmentCount = 0;

  // Fill first 7 days of day shifts with some assignments
  for (let i = 0; i < 7; i++) {
    const dayShifts = shiftIds.filter(
      (s) => s.type === "day" && s.date === format(addDays(startDate, i), "yyyy-MM-dd")
    );

    for (const ds of dayShifts) {
      // Assign Maria (charge nurse, Level 5) to all day shifts in week 1
      db.insert(schema.assignment).values({
        shiftId: ds.id,
        staffId: staffData[0].id,
        scheduleId,
        isChargeNurse: true,
        assignmentSource: "manual",
      }).run();
      assignmentCount++;

      // Assign Sarah (Level 4) or Emily (Level 3) alternating
      const secondNurse = i % 2 === 0 ? staffData[2] : staffData[4];
      db.insert(schema.assignment).values({
        shiftId: ds.id,
        staffId: secondNurse.id,
        scheduleId,
        assignmentSource: "manual",
      }).run();
      assignmentCount++;

      // Assign a CNA on weekdays
      if (i < 5) {
        db.insert(schema.assignment).values({
          shiftId: ds.id,
          staffId: staffData[11].id, // Jennifer CNA
          scheduleId,
          assignmentSource: "manual",
        }).run();
        assignmentCount++;
      }
    }

    // Night shifts - James (Level 4, charge) + one other
    const nightShifts = shiftIds.filter(
      (s) => s.type === "night" && s.date === format(addDays(startDate, i), "yyyy-MM-dd")
    );

    for (const ns of nightShifts) {
      db.insert(schema.assignment).values({
        shiftId: ns.id,
        staffId: staffData[1].id, // James - charge qualified
        scheduleId,
        isChargeNurse: true,
        assignmentSource: "manual",
      }).run();
      assignmentCount++;

      // Alternate between David (Level 3) and Michael (Level 3)
      const nightNurse = i % 2 === 0 ? staffData[5] : staffData[3];
      db.insert(schema.assignment).values({
        shiftId: ns.id,
        staffId: nightNurse.id,
        scheduleId,
        assignmentSource: "manual",
      }).run();
      assignmentCount++;
    }
  }

  console.log(`  Created ${assignmentCount} sample assignments (week 1)`);

  console.log("\nSeed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
