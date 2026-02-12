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

interface SwapRequest {
  id: string;
  requestingStaffId: string;
  targetStaffId: string | null;
  requestingAssignmentId: string;
  targetAssignmentId: string | null;
  status: "pending" | "approved" | "denied" | "cancelled";
  notes: string | null;
  requestor: { firstName: string; lastName: string } | null;
  target: { firstName: string; lastName: string } | null;
  requestorShiftDate: string | null;
  targetShiftDate: string | null;
  createdAt: string;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  denied: "destructive",
  cancelled: "outline",
};

export default function SwapsPage() {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("all");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/swap-requests");
    const data = await res.json();
    setSwapRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(id: string, status: "approved" | "denied") {
    await fetch(`/api/swap-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
  }

  const filteredRequests = filter === "all"
    ? swapRequests
    : swapRequests.filter(r => r.status === filter);

  const pendingCount = swapRequests.filter(r => r.status === "pending").length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shift Swap Requests</h1>
          <p className="mt-1 text-muted-foreground">
            {swapRequests.length} total requests ({pendingCount} pending review)
          </p>
        </div>
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
          <CardTitle>Swap Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredRequests.length === 0 ? (
            <p className="text-muted-foreground">No swap requests found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requesting Staff</TableHead>
                  <TableHead>Their Shift</TableHead>
                  <TableHead>Target Staff</TableHead>
                  <TableHead>Target Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">
                      {req.requestor?.firstName} {req.requestor?.lastName}
                    </TableCell>
                    <TableCell>{req.requestorShiftDate || "—"}</TableCell>
                    <TableCell>
                      {req.target ? (
                        `${req.target.firstName} ${req.target.lastName}`
                      ) : (
                        <span className="text-muted-foreground italic">Open request</span>
                      )}
                    </TableCell>
                    <TableCell>{req.targetShiftDate || "—"}</TableCell>
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
    </div>
  );
}
