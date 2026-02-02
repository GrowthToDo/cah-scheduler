export type CalloutReason = "sick" | "family_emergency" | "personal" | "no_show" | "other";
export type ReplacementSource = "float" | "per_diem" | "overtime" | "agency" | "unfilled";
export type CalloutStatus = "open" | "filled" | "unfilled_approved";

export interface EscalationStep {
  step: string;
  attempted: boolean;
  result: string;
  timestamp: string;
}

export interface Callout {
  id: string;
  assignmentId: string;
  staffId: string;
  shiftId: string;
  reason: CalloutReason;
  reasonDetail: string | null;
  calledOutAt: string;
  replacementStaffId: string | null;
  replacementSource: ReplacementSource | null;
  escalationStepsTaken: EscalationStep[];
  status: CalloutStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}
