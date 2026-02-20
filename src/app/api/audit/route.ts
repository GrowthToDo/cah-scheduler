import { db } from "@/db";
import { exceptionLog } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { NextResponse } from "next/server";

type EntityType = InferSelectModel<typeof exceptionLog>["entityType"];
type ActionType = InferSelectModel<typeof exceptionLog>["action"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const action = searchParams.get("action");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const query = db.select().from(exceptionLog);

  const conditions = [];
  if (entityType) {
    conditions.push(eq(exceptionLog.entityType, entityType as EntityType));
  }
  if (action) {
    conditions.push(eq(exceptionLog.action, action as ActionType));
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
