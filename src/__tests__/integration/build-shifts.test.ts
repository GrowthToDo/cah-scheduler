/**
 * Tests for the shift-generation logic used by POST /api/schedules.
 *
 * These are pure-function tests — no DB required.
 * They catch the class of bug where schedule creation omits the shift population step.
 */
import { describe, it, expect } from "vitest";
import { buildShiftInserts } from "@/lib/schedules/build-shifts";
import type { ShiftDefinitionLike } from "@/lib/schedules/build-shifts";

const dayDef: ShiftDefinitionLike = { id: "def-day", requiredStaffCount: 3, requiresChargeNurse: true };
const nightDef: ShiftDefinitionLike = { id: "def-night", requiredStaffCount: 2, requiresChargeNurse: false };

describe("buildShiftInserts", () => {
  it("returns empty array when no definitions provided", () => {
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-08", []);
    expect(result).toHaveLength(0);
  });

  it("creates one shift per definition per day for a single-day range", () => {
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-02", [dayDef, nightDef]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.date === "2026-03-02")).toBe(true);
    expect(result.find((r) => r.shiftDefinitionId === "def-day")).toBeDefined();
    expect(result.find((r) => r.shiftDefinitionId === "def-night")).toBeDefined();
  });

  it("creates numDays × numDefinitions shifts for a standard 6-week schedule", () => {
    // 42 days × 2 definitions = 84 shifts (matching seed.ts)
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-04-12", [dayDef, nightDef]);
    expect(result).toHaveLength(42 * 2);
  });

  it("includes the start date and end date (both inclusive)", () => {
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-04", [dayDef]);
    const dates = result.map((r) => r.date);
    expect(dates).toContain("2026-03-02");
    expect(dates).toContain("2026-03-03");
    expect(dates).toContain("2026-03-04");
    expect(result).toHaveLength(3);
  });

  it("each shift references the correct scheduleId", () => {
    const result = buildShiftInserts("my-schedule", "2026-03-02", "2026-03-03", [dayDef]);
    expect(result.every((r) => r.scheduleId === "my-schedule")).toBe(true);
  });

  it("inherits requiredStaffCount and requiresChargeNurse from the definition", () => {
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-02", [dayDef, nightDef]);
    const day = result.find((r) => r.shiftDefinitionId === "def-day")!;
    const night = result.find((r) => r.shiftDefinitionId === "def-night")!;
    expect(day.requiredStaffCount).toBe(3);
    expect(day.requiresChargeNurse).toBe(true);
    expect(night.requiredStaffCount).toBe(2);
    expect(night.requiresChargeNurse).toBe(false);
  });

  it("produces shifts for every calendar day including weekends", () => {
    // 2026-03-02 is Monday, 2026-03-08 is Sunday (7 days including both weekend days)
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-08", [dayDef]);
    expect(result).toHaveLength(7);
    // Verify Saturday and Sunday are included
    expect(result.some((r) => r.date === "2026-03-07")).toBe(true); // Saturday
    expect(result.some((r) => r.date === "2026-03-08")).toBe(true); // Sunday
  });

  it("handles single definition correctly", () => {
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-04", [dayDef]);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.shiftDefinitionId === "def-day")).toBe(true);
  });

  it("generates unique (date, definition) combinations — no duplicates", () => {
    const result = buildShiftInserts("sched-1", "2026-03-02", "2026-03-08", [dayDef, nightDef]);
    const keys = result.map((r) => `${r.date}::${r.shiftDefinitionId}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(result.length);
  });
});
