import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AssistantAttachmentKind, AssistantMode } from "@/lib/demo-types";
import { SESSION_COOKIE, SELECTED_MEMBER_COOKIE } from "@/lib/server/auth";
import { runAssistant } from "@/lib/server/assistant";

export const runtime = "nodejs";

const supportedModes = new Set<AssistantMode>(["plan", "guidance", "review"]);
const supportedAttachmentKinds = new Set<AssistantAttachmentKind>(["image", "video"]);

const maxAttachmentBytes = 16 * 1024 * 1024;

async function parseAttachment(formData: FormData) {
  const file = formData.get("attachment");
  const rawKind = String(formData.get("attachmentKind") ?? "").trim() as AssistantAttachmentKind;

  if (!(file instanceof File) || !file.size) {
    return null;
  }

  if (!supportedAttachmentKinds.has(rawKind)) {
    throw new Error("不支持的媒体类型。");
  }

  if (file.size > maxAttachmentBytes) {
    throw new Error("上传文件过大，请控制在 16MB 以内。");
  }

  const mimeType = file.type || (rawKind === "image" ? "image/jpeg" : "video/mp4");
  const isSupportedMime =
    rawKind === "image"
      ? /^image\/(jpeg|jpg|png|webp|gif|heic|heif)$/i.test(mimeType)
      : /^video\/(mp4|quicktime|webm|x-m4v)$/i.test(mimeType);

  if (!isSupportedMime) {
    throw new Error(rawKind === "image" ? "仅支持 jpg/png/webp/gif/heic 图片。" : "仅支持 mp4/mov/webm 视频。");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    kind: rawKind,
    mimeType,
    filename: file.name,
    dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
  };
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  const selectedMemberId = cookieStore.get(SELECTED_MEMBER_COOKIE)?.value ?? null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let mode = "" as AssistantMode;
  let message = "";
  let attachment: Awaited<ReturnType<typeof parseAttachment>> = null;

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      mode = String(formData.get("mode") ?? "").trim() as AssistantMode;
      message = String(formData.get("message") ?? "").trim();
      attachment = await parseAttachment(formData);
    } else {
      const body = (await request.json()) as { mode?: string; message?: string };
      mode = body.mode as AssistantMode;
      message = String(body.message ?? "").trim();
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "请求解析失败" },
      { status: 400 },
    );
  }

  if (!supportedModes.has(mode)) {
    return NextResponse.json({ error: "Unsupported mode" }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (attachment && mode !== "guidance") {
    return NextResponse.json({ error: "当前只有动作指导支持上传图片或视频。" }, { status: 400 });
  }

  const data = await runAssistant({
    userId,
    selectedMemberId,
    mode,
    message,
    attachment,
  });

  return NextResponse.json({ data });
}
