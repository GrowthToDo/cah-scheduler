"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Schedule {
  id: string;
  name: string;
  status: string;
}

interface Scenario {
  id: string;
  scheduleId: string;
  name: string;
  description: string | null;
  overallScore: number | null;
  coverageScore: number | null;
  fairnessScore: number | null;
  costScore: number | null;
  preferenceScore: number | null;
  skillMixScore: number | null;
  status: string;
  hardViolations: unknown[];
  softViolations: unknown[];
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null;
  const pct = Math.round((1 - score) * 100);
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-xs text-right">{pct}%</span>
    </div>
  );
}

export default function ScenariosPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then(setSchedules);
  }, []);

  const fetchScenarios = useCallback(async (scheduleId: string) => {
    setLoading(true);
    const res = await fetch(`/api/scenarios?scheduleId=${scheduleId}`);
    setScenarios(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      fetchScenarios(selectedScheduleId);
    }
  }, [selectedScheduleId, fetchScenarios]);

  async function handleGenerate() {
    if (!selectedScheduleId) return;
    setGenerating(true);
    await fetch("/api/scenarios/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduleId: selectedScheduleId }),
    });
    await fetchScenarios(selectedScheduleId);
    setGenerating(false);
  }

  async function handleSelect(id: string) {
    await fetch(`/api/scenarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "selected" }),
    });
    fetchScenarios(selectedScheduleId);
  }

  async function handleReject(id: string) {
    await fetch(`/api/scenarios/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "rejected" }),
    });
    fetchScenarios(selectedScheduleId);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Scenario Comparison</h1>
        <p className="mt-1 text-muted-foreground">
          Compare and select schedule scenarios.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a schedule" />
          </SelectTrigger>
          <SelectContent>
            {schedules.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGenerate}
          disabled={!selectedScheduleId || generating}
        >
          {generating ? "Generating..." : "Generate Scenarios"}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading scenarios...</p>
      ) : scenarios.length === 0 ? (
        <p className="text-muted-foreground">
          No scenarios yet. Select a schedule and generate scenarios.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <Card
              key={s.id}
              className={
                s.status === "selected"
                  ? "border-green-400"
                  : s.status === "rejected"
                  ? "border-red-200 opacity-60"
                  : ""
              }
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <Badge
                    variant={
                      s.status === "selected"
                        ? "default"
                        : s.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {s.status}
                  </Badge>
                </div>
                {s.description && (
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <ScoreBar label="Coverage" score={s.coverageScore} />
                  <ScoreBar label="Fairness" score={s.fairnessScore} />
                  <ScoreBar label="Cost" score={s.costScore} />
                  <ScoreBar label="Preference" score={s.preferenceScore} />
                  <ScoreBar label="Skill Mix" score={s.skillMixScore} />
                </div>

                <div className="flex items-center justify-between border-t pt-2">
                  <div>
                    <span className="text-sm font-medium">Overall: </span>
                    <span className="text-lg font-bold">
                      {s.overallScore !== null
                        ? Math.round((1 - s.overallScore) * 100) + "%"
                        : "-"}
                    </span>
                  </div>
                  {s.status === "draft" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        onClick={() => handleSelect(s.id)}
                      >
                        Select
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(s.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
