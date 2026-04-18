import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  applyAssistantResult,
  applyCoachEdit,
  getDemoState,
  saveProfile,
  selectMember,
  submitReview,
  toggleKnowledgeBase,
  togglePlanDay,
  updateKnowledgeBase,
  updateModelSetting,
} from "@/lib/server/demo-db";
import { SELECTED_MEMBER_COOKIE, SESSION_COOKIE } from "@/lib/server/auth";
import type { AssistantResponse, MemberProfile } from "@/lib/demo-types";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const memberId = cookieStore.get(SELECTED_MEMBER_COOKIE)?.value ?? null;
  return NextResponse.json({ data: getDemoState(userId, memberId) });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const memberId = cookieStore.get(SELECTED_MEMBER_COOKIE)?.value ?? null;
  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const response = NextResponse.next();

  switch (action) {
    case "select_member": {
      const selected = String(body.memberId);
      response.cookies.set(SELECTED_MEMBER_COOKIE, selected, { path: "/" });
      return NextResponse.json({ data: selectMember(userId, selected) }, { headers: response.headers });
    }

    case "save_profile":
      return NextResponse.json({ data: saveProfile(userId, body.profile as MemberProfile) });

    case "toggle_plan_day":
      return NextResponse.json({ data: togglePlanDay(userId, String(body.dayId)) });

    case "apply_coach_edit":
      return NextResponse.json({
        data: applyCoachEdit(userId, {
          memberId: String(body.memberId),
          dayId: String(body.dayId),
          focus: String(body.focus),
          intensity: String(body.intensity),
          coachNote: String(body.coachNote),
          reason: String(body.reason),
        }),
      });

    case "submit_review":
      return NextResponse.json({
        data: submitReview(userId, {
          memberId: String(body.memberId),
          completedSessions: Number(body.completedSessions),
          fatigueScore: Number(body.fatigueScore),
          weightChangeKg: Number(body.weightChangeKg),
          note: String(body.note),
        }),
      });

    case "toggle_knowledge_base":
      return NextResponse.json({ data: toggleKnowledgeBase(userId, String(body.id), memberId) });

    case "update_knowledge_base":
      return NextResponse.json({
        data: updateKnowledgeBase(
          userId,
          {
            id: String(body.id),
            name: String(body.name),
            description: String(body.description),
            category: String(body.category),
            documents: Number(body.documents),
            enabled: Boolean(body.enabled),
          },
          memberId,
        ),
      });

    case "update_model_setting":
      return NextResponse.json({
        data: updateModelSetting(userId, String(body.id), String(body.value), memberId),
      });

    case "apply_assistant_result":
      return NextResponse.json({
        data: applyAssistantResult(userId, {
          memberId: String(body.memberId),
          mode: String(body.mode) as "plan" | "guidance" | "review",
          response: body.response as AssistantResponse,
        }),
      });

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
