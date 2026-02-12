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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LeaveRequest {
  id: string;
  staffId: string;
  staffFirstName: string | null;
  staffLastName: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "denied";
  notes: string | null;
  createdAt: string;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
}

const leaveTypeLabels: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick Leave",
  maternity: "Maternity/Paternity",
  medical: "Medical Leave",
  personal: "Personal",
  bereavement: "Bereavement",
  other: "Other",
};

const statusColors: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  denied: "destructive",
};

export default function LeavePage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

  const [form, setForm] = useState({
    staffId: "",
    leaveType: "vacation",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    const [leaveRes, staffRes] = await Promise.all([
      fetch("/api/staff-leave"),
      fetch("/api/staff"),
    ]);
    const leaveData = await leaveRes.json();
    const staffData = await staffRes.json();
    setLeaveRequests(leaveData);
    setStaff(staffData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/staff-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    setForm({ staffId: "", leaveType: "vacation", startDate: "", endDate: "", notes: "" });
    fetchData();
  }

  async function handleStatusChange(id: string, status: "approved" | "denied") {
    await fetch(`/api/staff-leave/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  const filteredRequests = filter === "all"
    ? leaveRequests
    : leaveRequests.filter(r => r.status === filter);

  const pendingCount = leaveRequests.filter(r => r.status === "pending").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="mt-1 text-muted-foreground">
            {leaveRequests.length} total requests ({pendingCount} pending)
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>New Leave Request</Button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["all", "pending", "approved", "denied"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
            )}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.staffFirstName} {req.staffLastName}
                    </TableCell>
                    <TableCell>{leaveTypeLabels[req.leaveType] || req.leaveType}</TableCell>
                    <TableCell>{req.startDate}</TableCell>
                    <TableCell>{req.endDate}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[req.status]}>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{req.notes}</TableCell>
                    <TableCell>
                      {req.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusChange(req.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusChange(req.id, "denied")}
                          >
                            Deny
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={form.leaveType} onValueChange={(v) => setForm({ ...form, leaveType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(leaveTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Reason for leave..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Request</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
