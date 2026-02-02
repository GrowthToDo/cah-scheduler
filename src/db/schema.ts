import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================
// STAFF
// ============================================================
export const staff = sqliteTable(
  "staff",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    role: text("role", { enum: ["RN", "LPN", "CNA"] }).notNull(),
    employmentType: text("employment_type", {
      enum: ["full_time", "part_time", "per_diem", "float", "agency"],
    }).notNull(),
    fte: real("fte").notNull().default(1.0),
    hireDate: text("hire_date").notNull(),
    icuCompetencyLevel: integer("icu_competency_level").notNull().default(1),
    isChargeNurseQualified: integer("is_charge_nurse_qualified", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    certifications: text("certifications", { mode: "json" })
      .$type<string[]>()
      .default([]),
    reliabilityRating: integer("reliability_rating").notNull().default(3),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("staff_role_idx").on(table.role),
    index("staff_employment_type_idx").on(table.employmentType),
    index("staff_active_idx").on(table.isActive),
  ]
);

// ============================================================
// STAFF PREFERENCES
// ============================================================
export const staffPreferences = sqliteTable(
  "staff_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    preferredShift: text("preferred_shift", {
      enum: ["day", "night", "evening", "any"],
    }).default("any"),
    maxHoursPerWeek: integer("max_hours_per_week").default(40),
    maxConsecutiveDays: integer("max_consecutive_days").default(3),
    preferredDaysOff: text("preferred_days_off", { mode: "json" })
      .$type<string[]>()
      .default([]),
    preferredPattern: text("preferred_pattern"),
    avoidWeekends: integer("avoid_weekends", { mode: "boolean" }).default(
      false
    ),
    notes: text("notes"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [uniqueIndex("staff_preferences_staff_idx").on(table.staffId)]
);

// ============================================================
// SHIFT DEFINITIONS (templates)
// ============================================================
export const shiftDefinition = sqliteTable("shift_definition", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  shiftType: text("shift_type", {
    enum: ["day", "night", "evening"],
  }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  durationHours: real("duration_hours").notNull(),
  unit: text("unit").notNull().default("ICU"),
  requiredStaffCount: integer("required_staff_count").notNull().default(2),
  requiresChargeNurse: integer("requires_charge_nurse", {
    mode: "boolean",
  })
    .notNull()
    .default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

// ============================================================
// CENSUS BANDS
// ============================================================
export const censusBand = sqliteTable(
  "census_band",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("ICU"),
    minPatients: integer("min_patients").notNull(),
    maxPatients: integer("max_patients").notNull(),
    requiredRNs: integer("required_rns").notNull(),
    requiredCNAs: integer("required_cnas").notNull().default(0),
    requiredChargeNurses: integer("required_charge_nurses")
      .notNull()
      .default(1),
    patientToNurseRatio: text("patient_to_nurse_ratio")
      .notNull()
      .default("2:1"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("census_band_unit_idx").on(table.unit)]
);

// ============================================================
// RULES
// ============================================================
export const rule = sqliteTable(
  "rule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    ruleType: text("rule_type", { enum: ["hard", "soft"] }).notNull(),
    category: text("category", {
      enum: [
        "staffing",
        "rest",
        "fairness",
        "cost",
        "skill",
        "preference",
      ],
    }).notNull(),
    description: text("description"),
    parameters: text("parameters", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    weight: real("weight").notNull().default(1.0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("rule_type_idx").on(table.ruleType),
    index("rule_category_idx").on(table.category),
  ]
);

// ============================================================
// SCHEDULE
// ============================================================
export const schedule = sqliteTable(
  "schedule",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    unit: text("unit").notNull().default("ICU"),
    status: text("status", {
      enum: ["draft", "published", "archived"],
    })
      .notNull()
      .default("draft"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    publishedAt: text("published_at"),
  },
  (table) => [
    index("schedule_status_idx").on(table.status),
    index("schedule_dates_idx").on(table.startDate, table.endDate),
  ]
);

// ============================================================
// SHIFT (instances within a schedule)
// ============================================================
export const shift = sqliteTable(
  "shift",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    shiftDefinitionId: text("shift_definition_id")
      .notNull()
      .references(() => shiftDefinition.id),
    date: text("date").notNull(),
    requiredStaffCount: integer("required_staff_count"),
    requiresChargeNurse: integer("requires_charge_nurse", {
      mode: "boolean",
    }),
    actualCensus: integer("actual_census"),
    censusBandId: text("census_band_id").references(() => censusBand.id),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("shift_schedule_idx").on(table.scheduleId),
    index("shift_date_idx").on(table.date),
    uniqueIndex("shift_unique_idx").on(
      table.scheduleId,
      table.shiftDefinitionId,
      table.date
    ),
  ]
);

// ============================================================
// ASSIGNMENT
// ============================================================
export const assignment = sqliteTable(
  "assignment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    shiftId: text("shift_id")
      .notNull()
      .references(() => shift.id, { onDelete: "cascade" }),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["assigned", "confirmed", "called_out", "swapped", "cancelled"],
    })
      .notNull()
      .default("assigned"),
    isChargeNurse: integer("is_charge_nurse", { mode: "boolean" })
      .notNull()
      .default(false),
    isOvertime: integer("is_overtime", { mode: "boolean" })
      .notNull()
      .default(false),
    assignmentSource: text("assignment_source", {
      enum: [
        "manual",
        "auto_generated",
        "swap",
        "callout_replacement",
        "float",
      ],
    })
      .notNull()
      .default("manual"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("assignment_shift_idx").on(table.shiftId),
    index("assignment_staff_idx").on(table.staffId),
    index("assignment_schedule_idx").on(table.scheduleId),
    uniqueIndex("assignment_unique_idx").on(table.shiftId, table.staffId),
  ]
);

// ============================================================
// CALLOUT
// ============================================================
export const callout = sqliteTable(
  "callout",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignment.id),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id),
    shiftId: text("shift_id")
      .notNull()
      .references(() => shift.id),
    reason: text("reason", {
      enum: ["sick", "family_emergency", "personal", "no_show", "other"],
    }).notNull(),
    reasonDetail: text("reason_detail"),
    calledOutAt: text("called_out_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    replacementStaffId: text("replacement_staff_id").references(
      () => staff.id
    ),
    replacementSource: text("replacement_source", {
      enum: ["float", "per_diem", "overtime", "agency", "unfilled"],
    }),
    escalationStepsTaken: text("escalation_steps_taken", { mode: "json" })
      .$type<
        {
          step: string;
          attempted: boolean;
          result: string;
          timestamp: string;
        }[]
      >()
      .default([]),
    status: text("status", {
      enum: ["open", "filled", "unfilled_approved"],
    })
      .notNull()
      .default("open"),
    resolvedAt: text("resolved_at"),
    resolvedBy: text("resolved_by"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("callout_shift_idx").on(table.shiftId),
    index("callout_staff_idx").on(table.staffId),
    index("callout_status_idx").on(table.status),
  ]
);

// ============================================================
// SCENARIO
// ============================================================
export const scenario = sqliteTable(
  "scenario",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedule.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    overallScore: real("overall_score"),
    coverageScore: real("coverage_score"),
    fairnessScore: real("fairness_score"),
    costScore: real("cost_score"),
    preferenceScore: real("preference_score"),
    skillMixScore: real("skill_mix_score"),
    assignmentSnapshot: text("assignment_snapshot", { mode: "json" }).$type<
      {
        shiftId: string;
        staffId: string;
        isChargeNurse: boolean;
        isOvertime: boolean;
      }[]
    >(),
    hardViolations: text("hard_violations", { mode: "json" })
      .$type<
        {
          ruleId: string;
          ruleName: string;
          shiftId: string;
          staffId: string;
          description: string;
        }[]
      >()
      .default([]),
    softViolations: text("soft_violations", { mode: "json" })
      .$type<
        {
          ruleId: string;
          ruleName: string;
          shiftId: string;
          staffId: string;
          description: string;
          penaltyScore: number;
        }[]
      >()
      .default([]),
    status: text("status", {
      enum: ["draft", "selected", "rejected"],
    })
      .notNull()
      .default("draft"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [index("scenario_schedule_idx").on(table.scheduleId)]
);

// ============================================================
// EXCEPTION LOG (audit trail)
// ============================================================
export const exceptionLog = sqliteTable(
  "exception_log",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    entityType: text("entity_type", {
      enum: [
        "assignment",
        "schedule",
        "callout",
        "rule",
        "staff",
        "scenario",
      ],
    }).notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action", {
      enum: [
        "created",
        "updated",
        "deleted",
        "override_hard_rule",
        "override_soft_rule",
        "published",
        "archived",
        "callout_logged",
        "callout_filled",
        "scenario_selected",
        "scenario_rejected",
        "swap_requested",
        "swap_approved",
        "forced_overtime",
        "manual_assignment",
      ],
    }).notNull(),
    description: text("description").notNull(),
    previousState: text("previous_state", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    newState: text("new_state", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    overriddenRuleId: text("overridden_rule_id").references(() => rule.id),
    justification: text("justification"),
    performedBy: text("performed_by").notNull().default("nurse_manager"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("exception_log_entity_idx").on(table.entityType, table.entityId),
    index("exception_log_action_idx").on(table.action),
    index("exception_log_date_idx").on(table.createdAt),
  ]
);
