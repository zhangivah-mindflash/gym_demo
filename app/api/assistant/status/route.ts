import { NextResponse } from "next/server";
import { isAssistantConfigured, supportsMultimodal } from "@/lib/server/assistant";

export const runtime = "nodejs";

export async function GET() {
  const baseUrl = (process.env.LLM_BASE_URL ?? "").trim();
  const model = (process.env.LLM_MODEL ?? "").trim();
  const apiKey = (process.env.LLM_API_KEY ?? "").trim();
  const provider = (process.env.LLM_PROVIDER ?? "").trim();

  return NextResponse.json({
    configured: isAssistantConfigured(),
    multimodal: supportsMultimodal(),
    env: {
      LLM_BASE_URL: baseUrl || null,
      LLM_MODEL: model || null,
      LLM_PROVIDER: provider || null,
      LLM_API_KEY: apiKey ? `配置中，长度 ${apiKey.length}` : null,
    },
  });
}
