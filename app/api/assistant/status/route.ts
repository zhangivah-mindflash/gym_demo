import { NextResponse } from "next/server";
import { isAssistantConfigured, runAssistant, supportsMultimodal } from "@/lib/server/assistant";

export const runtime = "nodejs";

export async function GET() {
  const baseUrl = (process.env.LLM_BASE_URL ?? "").trim();
  const model = (process.env.LLM_MODEL ?? "").trim();
  const apiKey = (process.env.LLM_API_KEY ?? "").trim();
  const provider = (process.env.LLM_PROVIDER ?? "").trim();

  let testResult:
    | { ok: true; providerLabel: string; summary: string }
    | { ok: false; error: string }
    | null = null;

  if (isAssistantConfigured()) {
    try {
      const result = await runAssistant({ mode: "plan", message: "请返回一个极简的测试训练计划。" });
      if (result.usedFallback) {
        testResult = { ok: false, error: result.disclaimer };
      } else {
        testResult = {
          ok: true,
          providerLabel: result.providerLabel,
          summary: result.summary.slice(0, 160),
        };
      }
    } catch (error) {
      testResult = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return NextResponse.json({
    configured: isAssistantConfigured(),
    multimodal: supportsMultimodal(),
    env: {
      LLM_BASE_URL: baseUrl || null,
      LLM_MODEL: model || null,
      LLM_PROVIDER: provider || null,
      LLM_API_KEY: apiKey ? `配置中，长度 ${apiKey.length}` : null,
    },
    test: testResult,
  });
}
