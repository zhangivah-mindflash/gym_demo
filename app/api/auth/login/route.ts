import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/server/demo-db";
import { SELECTED_MEMBER_COOKIE, SESSION_COOKIE } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const session = verifyUser(body.username ?? "", body.password ?? "");

  if (!session?.isAuthenticated || !session.userId) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ session });
  response.cookies.set(SESSION_COOKIE, session.userId, { path: "/", httpOnly: true });
  if (session.memberId) {
    response.cookies.set(SELECTED_MEMBER_COOKIE, session.memberId, { path: "/" });
  } else {
    response.cookies.delete(SELECTED_MEMBER_COOKIE);
  }
  return response;
}
