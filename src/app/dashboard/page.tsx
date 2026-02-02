"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  staffCount: number;
  totalFTE: number;
  scheduleInfo: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
  totalShifts: number;
  totalAssignments: number;
  totalSlots: number;
  fillRate: number;
  understaffedShifts: number;
  openCallouts: number;
  recentAudit: {
    id: string;
    action: string;
    description: string;
    entityType: string;
    createdAt: string;
  }[];
}

const actionLabels: Record<string, string> = {
  manual_assignment: "Assignment",
  callout_logged: "Callout",
  callout_filled: "Callout Filled",
  scenario_selected: "Scenario",
  deleted: "Removed",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {data.scheduleInfo && (
          <p className="mt-1 text-muted-foreground">
            Current period: {data.scheduleInfo.name} ({data.scheduleInfo.status})
          </p>
        )}
      </div>

      {/* Alert cards */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Active Staff</p>
            <p className="text-2xl font-bold">{data.staffCount}</p>
            <p className="text-xs text-muted-foreground">
              {data.totalFTE.toFixed(1)} total FTE
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Fill Rate</p>
            <p
              className={`text-2xl font-bold ${
                data.fillRate >= 80
                  ? "text-green-600"
                  : data.fillRate >= 50
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {data.fillRate}%
            </p>
            <p className="text-xs text-muted-foreground">
              {data.totalAssignments}/{data.totalSlots} slots filled
            </p>
          </CardContent>
        </Card>

        <Card className={data.understaffedShifts > 0 ? "border-yellow-400" : ""}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Understaffed Shifts</p>
            <p
              className={`text-2xl font-bold ${
                data.understaffedShifts > 0 ? "text-yellow-600" : "text-green-600"
              }`}
            >
              {data.understaffedShifts}
            </p>
            <p className="text-xs text-muted-foreground">
              of {data.totalShifts} total shifts
            </p>
          </CardContent>
        </Card>

        <Card className={data.openCallouts > 0 ? "border-red-400" : ""}>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Open Callouts</p>
            <p
              className={`text-2xl font-bold ${
                data.openCallouts > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {data.openCallouts}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.openCallouts > 0 ? "Needs attention" : "All resolved"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {data.scheduleInfo && (
          <Link href={`/schedule/${data.scheduleInfo.id}`}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="pt-4">
                <p className="text-sm font-medium">Open Schedule Builder</p>
                <p className="text-xs text-muted-foreground">
                  {data.scheduleInfo.name}
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <Link href="/staff">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="pt-4">
              <p className="text-sm font-medium">Manage Staff</p>
              <p className="text-xs text-muted-foreground">
                {data.staffCount} active members
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/callouts">
          <Card className="cursor-pointer transition-colors hover:bg-accent">
            <CardContent className="pt-4">
              <p className="text-sm font-medium">Callout Management</p>
              <p className="text-xs text-muted-foreground">
                {data.openCallouts} open
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-2">
              {data.recentAudit.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.entityType}
                    </Badge>
                    <span className="text-sm">{entry.description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
