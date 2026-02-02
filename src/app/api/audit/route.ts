import { db } from "@/db";
import { exceptionLog } from "@/db/schema";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  let query = db.select().from(exceptionLog);

  const conditions = [];
  if (entityType) {
    conditions.push(eq(exceptionLog.entityType, entityType as any));
  }
  if (action) {
    conditions.push(eq(exceptionLog.action, action as any));
  }

  const logs =
    conditions.length > 0
      ? query
          .where(and(...conditions))
          .orderBy(desc(exceptionLog.createdAt))
          .limit(limit)
          .all()
      : query.orderBy(desc(exceptionLog.createdAt)).limit(limit).all();

  return NextResponse.json(logs);
}
