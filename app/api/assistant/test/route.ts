import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/auth";
import { getDemoState } from "@/lib/server/demo-db";
import { testModelConnection } from "@/lib/server/assistant";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = getDemoState(userId, null);
  if (state.session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { config?: Record<string, string> };
  const result = await testModelConnection(body.config ?? {});

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
