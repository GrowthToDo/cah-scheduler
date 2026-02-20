import { db } from "@/db";
import { generationJob } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "jobId query parameter required" }, { status: 400 });
  }

  const job = db.select().from(generationJob).where(eq(generationJob.id, jobId)).get();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    currentPhase: job.currentPhase,
    error: job.error,
    warnings: job.warnings,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}
