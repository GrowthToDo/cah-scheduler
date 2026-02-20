"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { format, parseISO } from "date-fns";

interface Schedule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  unit: string;
  status: string;
  createdAt: string;
}

interface Unit {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    setSchedules(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetch("/api/units")
      .then((r) => r.json())
      .then(setUnits);
  }, [fetchSchedules]);

  function openDialog() {
    setName("");
    setStartDate("");
    setEndDate("");
    setSelectedUnit(units[0]?.name ?? "");
    setError(null);
    setDialogOpen(true);
  }

  async function handleCreate() {
    if (!name.trim() || !startDate || !endDate || !selectedUnit) {
      setError("All fields are required.");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be on or after start date.");
      return;
    }

    setCreating(true);
    setError(null);

    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), startDate, endDate, unit: selectedUnit }),
    });

    if (!res.ok) {
      setError("Failed to create schedule. Please try again.");
      setCreating(false);
      return;
    }

    const created = await res.json();
    setDialogOpen(false);
    setCreating(false);
    router.push(`/schedule/${created.id}`);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule Builder</h1>
          <p className="mt-1 text-muted-foreground">
            {schedules.length} schedule period{schedules.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openDialog}>New Schedule</Button>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No schedule periods yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Click <strong>New Schedule</strong> to create your first one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s) => (
            <Link key={s.id} href={`/schedule/${s.id}`}>
              <Card className="cursor-pointer transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{s.name}</CardTitle>
                    <Badge
                      variant={
                        s.status === "published"
                          ? "default"
                          : s.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(s.startDate), "MMM d")} -{" "}
                    {format(parseISO(s.endDate), "MMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">{s.unit}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Schedule Period</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="sched-name">Schedule Name</Label>
              <Input
                id="sched-name"
                placeholder="e.g. ICU — Feb/Mar 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sched-start">Start Date</Label>
                <Input
                  id="sched-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sched-end">End Date</Label>
                <Input
                  id="sched-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.name}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {units.length === 0 && (
                <p className="text-xs text-destructive">
                  No units found. Import your data first via the Setup page.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || units.length === 0}>
              {creating ? "Creating…" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
