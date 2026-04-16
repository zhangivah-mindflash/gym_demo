import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AssistantMode } from "@/lib/demo-types";
import { SESSION_COOKIE, SELECTED_MEMBER_COOKIE } from "@/lib/server/auth";
import { runAssistant } from "@/lib/server/assistant";

export const runtime = "nodejs";

const supportedModes = new Set<AssistantMode>(["plan", "guidance", "review"]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const selectedMemberId = cookieStore.get(SELECTED_MEMBER_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { mode?: string; message?: string };
  const mode = body.mode as AssistantMode;
  const message = String(body.message ?? "").trim();

  if (!supportedModes.has(mode)) {
    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const data = await runAssistant({
    userId,
    selectedMemberId,
    mode,
    message,
  });

  return NextResponse.json({ data });
}
