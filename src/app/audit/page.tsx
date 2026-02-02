"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  justification: string | null;
  performedBy: string;
  createdAt: string;
}

const actionLabels: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  override_hard_rule: "Hard Rule Override",
  override_soft_rule: "Soft Rule Override",
  published: "Published",
  archived: "Archived",
  callout_logged: "Callout Logged",
  callout_filled: "Callout Filled",
  scenario_selected: "Scenario Selected",
  scenario_rejected: "Scenario Rejected",
  swap_requested: "Swap Requested",
  swap_approved: "Swap Approved",
  forced_overtime: "Forced Overtime",
  manual_assignment: "Manual Assignment",
};

const actionColors: Record<string, string> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  override_hard_rule: "destructive",
  callout_logged: "destructive",
  callout_filled: "default",
  scenario_selected: "default",
  manual_assignment: "secondary",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterEntity !== "all") params.set("entityType", filterEntity);
    if (filterAction !== "all") params.set("action", filterAction);
    params.set("limit", "100");

    const res = await fetch(`/api/audit?${params}`);
    setLogs(await res.json());
    setLoading(false);
  }, [filterEntity, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="mt-1 text-muted-foreground">
          Decision history and exception logs.
        </p>
      </div>

      <div className="mb-4 flex gap-4">
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="assignment">Assignments</SelectItem>
            <SelectItem value="schedule">Schedules</SelectItem>
            <SelectItem value="callout">Callouts</SelectItem>
            <SelectItem value="rule">Rules</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="scenario">Scenarios</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="manual_assignment">Manual Assignment</SelectItem>
            <SelectItem value="callout_logged">Callout Logged</SelectItem>
            <SelectItem value="callout_filled">Callout Filled</SelectItem>
            <SelectItem value="scenario_selected">Scenario Selected</SelectItem>
            <SelectItem value="override_hard_rule">Hard Rule Override</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Log ({logs.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">No audit entries found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (actionColors[entry.action] as any) ?? "secondary"
                        }
                      >
                        {actionLabels[entry.action] ?? entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.entityType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md text-sm">
                      {entry.description}
                      {entry.justification && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Justification: {entry.justification}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.performedBy}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
