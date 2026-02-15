"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { format, parseISO } from "date-fns";

interface OpenShiftData {
  id: string;
  shiftId: string;
  originalStaffId: string;
  reason: string;
  reasonDetail: string | null;
  status: "open" | "filled" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  filledAt: string | null;
  filledByStaffId: string | null;
  shiftDate: string;
  shiftType: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  unit: string;
  originalStaffFirstName: string;
  originalStaffLastName: string;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
}

const PRIORITY_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  normal: "outline",
  high: "default",
  urgent: "destructive",
};

const REASON_LABELS: Record<string, string> = {
  leave_approved: "Leave Approved",
  callout: "Callout",
  schedule_change: "Schedule Change",
  other: "Other",
};

export default function OpenShiftsPage() {
  const [openShifts, setOpenShifts] = useState<OpenShiftData[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [fillDialogOpen, setFillDialogOpen] = useState(false);
  const [selectedOpenShift, setSelectedOpenShift] = useState<OpenShiftData | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "open" | "filled" | "cancelled">("open");

  const fetchData = useCallback(async () => {
    const [shiftsRes, staffRes] = await Promise.all([
      fetch("/api/open-shifts"),
      fetch("/api/staff"),
    ]);
    const [shiftsData, staffData] = await Promise.all([
      shiftsRes.json(),
      staffRes.json(),
    ]);
    setOpenShifts(shiftsData);
    setStaff(staffData.filter((s: StaffMember) => s.isActive));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleFillClick(openShift: OpenShiftData) {
    setSelectedOpenShift(openShift);
    setSelectedStaffId("");
    setFillDialogOpen(true);
  }

  async function handleFillSubmit() {
    if (!selectedOpenShift || !selectedStaffId) return;

    await fetch(`/api/open-shifts/${selectedOpenShift.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "fill",
        filledByStaffId: selectedStaffId,
      }),
    });

    setFillDialogOpen(false);
    setSelectedOpenShift(null);
    setSelectedStaffId("");
    fetchData();
  }

  async function handleCancel(openShiftId: string) {
    if (!confirm("Are you sure you want to cancel this open shift?")) return;

    await fetch(`/api/open-shifts/${openShiftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });

    fetchData();
  }

  const filteredShifts = openShifts.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const openCount = openShifts.filter((s) => s.status === "open").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Open Shifts</h1>
          <p className="mt-1 text-muted-foreground">
            {openCount} open shift{openCount !== 1 ? "s" : ""} available for pickup
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["open", "filled", "cancelled", "all"] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === "open" && openCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {openCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredShifts.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No {filter !== "all" ? filter : ""} shifts found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Original Staff</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShifts.map((os) => (
                  <TableRow key={os.id}>
                    <TableCell className="font-medium">
                      {format(parseISO(os.shiftDate), "EEE, MMM d")}
                    </TableCell>
                    <TableCell>
                      <div>{os.shiftName}</div>
                      <div className="text-xs text-muted-foreground">
                        {os.startTime} - {os.endTime}
                      </div>
                    </TableCell>
                    <TableCell>{os.unit}</TableCell>
                    <TableCell>
                      {os.originalStaffFirstName} {os.originalStaffLastName}
                    </TableCell>
                    <TableCell>
                      <div>{REASON_LABELS[os.reason] || os.reason}</div>
                      {os.reasonDetail && (
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {os.reasonDetail}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PRIORITY_VARIANTS[os.priority]}>
                        {os.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          os.status === "open"
                            ? "default"
                            : os.status === "filled"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {os.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {os.status === "open" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleFillClick(os)}
                          >
                            Fill
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(os.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fill shift dialog */}
      <Dialog open={fillDialogOpen} onOpenChange={setFillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fill Open Shift</DialogTitle>
          </DialogHeader>
          {selectedOpenShift && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm">
                <p>
                  <strong>Date:</strong>{" "}
                  {format(parseISO(selectedOpenShift.shiftDate), "EEEE, MMMM d, yyyy")}
                </p>
                <p>
                  <strong>Shift:</strong> {selectedOpenShift.shiftName} ({selectedOpenShift.startTime} - {selectedOpenShift.endTime})
                </p>
                <p>
                  <strong>Unit:</strong> {selectedOpenShift.unit}
                </p>
              </div>

              <div>
                <Label>Assign to Staff Member</Label>
                <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} ({s.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFillDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleFillSubmit} disabled={!selectedStaffId}>
                  Assign Shift
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
