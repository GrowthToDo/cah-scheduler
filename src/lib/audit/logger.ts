import { db } from "@/db";
import { exceptionLog } from "@/db/schema";

type EntityType = "assignment" | "schedule" | "callout" | "rule" | "staff" | "scenario";
type Action =
  | "created" | "updated" | "deleted"
  | "override_hard_rule" | "override_soft_rule"
  | "published" | "archived"
  | "callout_logged" | "callout_filled"
  | "scenario_selected" | "scenario_rejected"
  | "swap_requested" | "swap_approved"
  | "forced_overtime" | "manual_assignment";

export function logAuditEvent(params: {
  entityType: EntityType;
  entityId: string;
  action: Action;
  description: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  overriddenRuleId?: string;
  justification?: string;
  performedBy?: string;
}) {
  return db.insert(exceptionLog).values({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    description: params.description,
    previousState: params.previousState,
    newState: params.newState,
    overriddenRuleId: params.overriddenRuleId,
    justification: params.justification,
    performedBy: params.performedBy ?? "nurse_manager",
  }).run();
}
