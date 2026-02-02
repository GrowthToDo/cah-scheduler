"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    const res = await fetch("/api/schedules");
    setSchedules(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Schedule Builder</h1>
        <p className="mt-1 text-muted-foreground">
          {schedules.length} schedule period{schedules.length !== 1 ? "s" : ""}
        </p>
      </div>

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
    </div>
  );
}
