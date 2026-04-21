import { guidanceBase, initialDemoState, nutritionHints } from "@/lib/mock-data";
import { modelSettingDefinitions } from "@/lib/model-settings";
import type {
  AssistantAttachmentKind,
  AssistantCitation,
  AssistantMode,
  AssistantPlanDay,
  AssistantResponse,
  DemoState,
} from "@/lib/demo-types";

type AssistantRequest = {
  mode: AssistantMode;
  message: string;
  attachment?: AssistantAttachment | null;
};

type AssistantSettings = Record<string, string>;

type AssistantAttachment = {
  kind: AssistantAttachmentKind;
  mimeType: string;
  dataUrl: string;
  filename?: string;
};

type LlmResponsePayload = Partial<AssistantResponse> & {
  highlights?: unknown;
  trainingPlan?: unknown;
  nutritionTips?: unknown;
  guidancePoints?: unknown;
  reviewInsights?: unknown;
  recoveryActions?: unknown;
  safetyFlags?: unknown;
  citations?: unknown;
  nextSteps?: unknown;
};

type ResponsesApiJson = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type ChatCompletionsJson = {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
};

// Map setting ids to environment variable names.
// Users set these in Vercel Project Settings -> Environment Variables.
const envVarMap: Record<string, string> = {
  "llm-provider": "LLM_PROVIDER",
  "llm-base-url": "LLM_BASE_URL",
  "llm-api-key": "LLM_API_KEY",
  "llm-model": "LLM_MODEL",
  "assistant-system": "LLM_SYSTEM_PROMPT",
  "plan-system": "LLM_PLAN_PROMPT",
  "guidance-system": "LLM_GUIDANCE_PROMPT",
  "review-system": "LLM_REVIEW_PROMPT",
};

function loadSettings(): AssistantSettings {
  const result: AssistantSettings = {};
  for (const def of modelSettingDefinitions) {
    const envName = envVarMap[def.id];
    const fromEnv = envName ? process.env[envName] : undefined;
    result[def.id] = (fromEnv ?? def.defaultValue ?? "").trim();
  }
  return result;
}

function staticDemoState(): DemoState {
  return initialDemoState;
}

function containsRiskSignal(text: string) {
  return /(痛|疼|晕|眩晕|胸闷|旧伤|不适|麻|产后|孕)/.test(text);
}

function trimBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function isDashScope(baseUrl: string) {
  return /dashscope\.aliyuncs\.com/i.test(baseUrl);
}

function normalizeProtocol(value: string | undefined) {
  return (value ?? "auto").trim().toLowerCase();
}

function resolveProtocol(settings: AssistantSettings) {
  const protocol = normalizeProtocol(settings["llm-provider"]);
  const baseUrl = settings["llm-base-url"]?.trim() ?? "";

  if (protocol === "openai-chat-completions" || protocol === "chat-completions" || protocol === "chat") {
    return "openai-chat-completions" as const;
  }

  if (protocol === "openai-responses" || protocol === "responses") {
    return "openai-responses" as const;
  }

  if (isDashScope(baseUrl)) {
    return "openai-responses" as const;
  }

  return "openai-chat-completions" as const;
}

function buildSystemPrompt(mode: AssistantMode, settings: AssistantSettings) {
  return `${settings["assistant-system"] ?? ""}\n${buildModePrompt(mode, settings)}\n你必须只返回合法 JSON，不要输出 markdown 代码块。`;
}

function parseProviderError(status: number, bodyText: string) {
  if (!bodyText) {
    return `模型接口返回 ${status}`;
  }

  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string } | string;
      message?: string;
    };

    if (typeof parsed.error === "string") {
      return `模型接口返回 ${status}: ${parsed.error}`;
    }

    if (parsed.error?.message) {
      return `模型接口返回 ${status}: ${parsed.error.message}`;
    }

    if (parsed.message) {
      return `模型接口返回 ${status}: ${parsed.message}`;
    }
  } catch {
    return `模型接口返回 ${status}: ${bodyText.slice(0, 240)}`;
  }

  return `模型接口返回 ${status}`;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function asPlanArray(value: unknown): AssistantPlanDay[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        dayLabel: String(row.dayLabel ?? row.day_label ?? ""),
        focus: String(row.focus ?? ""),
        duration: String(row.duration ?? ""),
        intensity: String(row.intensity ?? ""),
        note: String(row.note ?? row.coachNote ?? ""),
      };
    })
    .filter((item): item is AssistantPlanDay => Boolean(item?.dayLabel && item.focus));
}

function asCitationArray(value: unknown): AssistantCitation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      return {
        title: String(row.title ?? ""),
        source: String(row.source ?? ""),
        note: String(row.note ?? row.snippet ?? ""),
      };
    })
    .filter((item): item is AssistantCitation => Boolean(item?.title && item.source));
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM did not return JSON");
  }
  return text.slice(start, end + 1);
}

function extractResponsesText(json: ResponsesApiJson) {
  if (json.output_text?.trim()) {
    return json.output_text.trim();
  }

  const chunks =
    json.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === "output_text" && item.text)
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  if (chunks.length) {
    return chunks.join("\n");
  }

  return "";
}

function parseAbortError(error: unknown, timeoutMs: number) {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error(`请求超时：外部模型在 ${Math.round(timeoutMs / 1000)} 秒内未返回结果。请检查调用协议、Base URL、网络状态，或关闭模型思考模式。`);
  }

  return error instanceof Error ? error : new Error("外部模型请求失败。");
}

function extractChatText(json: ChatCompletionsJson) {
  const content = json.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }

  const chunks =
    content
      ?.filter((item) => item.type === "text" && item.text)
      .map((item) => item.text?.trim() ?? "")
      .filter(Boolean) ?? [];

  return chunks.join("\n");
}

function currentCitations(state: DemoState) {
  const enabledKb = new Set(state.knowledgeBase.filter((entry) => entry.enabled).map((entry) => entry.id));
  return guidanceBase.citations
    .filter((citation) => enabledKb.has(citation.bucket))
    .map((citation) => ({
      title: citation.title,
      source: citation.source,
      note: citation.snippet,
    }));
}

function planFallback(state: DemoState, message: string): AssistantResponse {
  const { memberProfile, weeklyPlan, review } = state;
  const riskFlag = containsRiskSignal([message, memberProfile.injuryHistory, review.note].join(" "));

  return {
    mode: "plan",
    title: `${memberProfile.memberName} 的训练计划建议`,
    summary: `围绕"${memberProfile.goalLabel}"生成一周训练与简化饮食建议，优先保证 ${memberProfile.trainingDays} 天可执行，并考虑当前风险边界。`,
    highlights: [
      `每周安排 ${memberProfile.trainingDays} 天训练，每次约 ${memberProfile.sessionMinutes} 分钟。`,
      `当前训练水平为 ${memberProfile.trainingLevel}，器械条件为 ${memberProfile.equipmentAccess}。`,
      riskFlag ? "检测到伤病/不适信号，计划优先降低冲击与训练总量。" : "当前无明显高风险信号，可按稳步推进负荷的节奏执行。",
    ],
    trainingPlan: weeklyPlan.days.map((day) => ({
      dayLabel: day.dayLabel,
      focus: day.focus,
      duration: day.duration,
      intensity: day.intensity,
      note: day.coachNote,
    })),
    nutritionTips: [
      ...nutritionHints.map((item) => `${item.title}：${item.body}`),
      `结合会员偏好，当前建议采用"${memberProfile.dietPreference}"的轻量执行策略。`,
    ],
    guidancePoints: [],
    reviewInsights: [],
    recoveryActions: [
      "优先保证睡眠与训练后 10 分钟低强度整理。",
      riskFlag ? "下肢或疼痛相关动作先用更稳妥的替代动作，不做高冲击推进。" : "无明显不适时，可在完成率稳定后微调训练量。",
    ],
    safetyFlags: riskFlag
      ? [
          "出现疼痛、眩晕、麻木、症状放射时，应立即停止训练并联系教练。",
          "该建议不构成医疗诊断，伤病相关问题需转专业评估。",
        ]
      : ["如出现异常疼痛或头晕，应立即停止训练并联系教练。"],
    citations: currentCitations(state),
    nextSteps: ["与真人教练复核后再正式发布计划。", "执行一周后提交复盘，系统再更新下周安排。"],
    providerLabel: "规则生成",
    disclaimer: "当前未配置外部模型或请求失败，展示本地规则生成结果。",
    usedFallback: true,
  };
}

function guidanceFallback(state: DemoState, message: string, options?: { mediaAttached?: boolean }): AssistantResponse {
  const riskFlag = containsRiskSignal(message);
  const mediaNotice = options?.mediaAttached ? "由于未成功完成媒体识别，以下内容仅为通用动作指导。" : "";

  return {
    mode: "guidance",
    title: `${guidanceBase.exercise} 动作指导`,
    summary: `针对当前动作问题输出要点、热身、放松与风险提醒，${riskFlag ? "并提高安全边界" : "保持常规指导强度"}。${mediaNotice}`,
    highlights: [
      `${guidanceBase.target} 为主要目标肌群。`,
      `建议强度控制在 RPE ${guidanceBase.rpe}，组间休息 ${guidanceBase.rest}。`,
      ...(options?.mediaAttached ? ["未完成对上传照片/视频的真实识别，请先检查模型多模态能力后再重试。"] : []),
      riskFlag ? "用户问题中存在风险信号，动作指导必须以停止刺激和升级提示为先。" : "当前以动作质量优先，不追求过度加重。",
    ],
    trainingPlan: [],
    nutritionTips: [],
    guidancePoints: [
      ...guidanceBase.cues,
      `热身：${guidanceBase.warmup}`,
      `放松：${guidanceBase.cooldown}`,
      `替代动作：${guidanceBase.alternative}`,
    ],
    reviewInsights: [],
    recoveryActions: [
      "先确认动作控制，再推进重量。",
      "训练后优先低强度整理和呼吸恢复。",
    ],
    safetyFlags: riskFlag
      ? [
          "如果出现锐痛、放射痛、头晕、胸闷，不应继续训练。",
          "高风险信号应先联系教练，必要时转专业评估。",
        ]
      : ["动作中如出现异常不适，应立即降重或停止。"],
    citations: currentCitations(state),
    nextSteps: ["先用较轻重量完成一组动作测试。", "如果依旧不稳，切换到更稳妥的替代动作。"],
    providerLabel: "规则生成",
    disclaimer: "当前未配置外部模型或请求失败，展示本地规则生成结果。",
    usedFallback: true,
  };
}

function reviewFallback(state: DemoState, message: string): AssistantResponse {
  const { review, weeklyPlan } = state;
  const completedCount = weeklyPlan.days.filter((day) => day.completed).length;
  const riskFlag = containsRiskSignal([message, review.note].join(" "));

  return {
    mode: "review",
    title: `${state.memberProfile.memberName} 的训练复盘建议`,
    summary: `本周完成 ${review.completedSessions}/${review.totalSessions} 次训练，主观疲劳 ${review.fatigueScore}/10，系统基于执行情况生成下周调整建议。`,
    highlights: [
      `当前实际打卡 ${completedCount} 次，复盘记录为 ${review.completedSessions} 次。`,
      `最近体重变化 ${review.weightChangeKg} kg，风险等级为 ${review.riskLevel}。`,
      riskFlag ? "复盘文本中存在风险关键词，下周计划应先降风险再推进。" : "当前可围绕依从性和恢复状态微调下一周节奏。",
    ],
    trainingPlan: [],
    nutritionTips: [
      review.weightChangeKg < 0 ? "减脂趋势存在，维持基础蛋白质和训练日前后主食摄入。" : "若体重未下降，不要先极端节食，优先检查执行一致性与总活动量。",
    ],
    guidancePoints: [],
    reviewInsights: [
      `风险结论：${review.nextAdjustment}`,
      riskFlag ? "建议教练优先复核伤病相关动作与训练容量。" : "可在保证恢复的前提下小幅推进训练密度。",
    ],
    recoveryActions: [
      `疲劳 ${review.fatigueScore}/10，建议本周至少安排 1-2 天主动恢复。`,
      "优先保证睡眠和训练后整理，避免连续高强度堆叠。",
    ],
    safetyFlags: riskFlag
      ? ["出现疼痛、眩晕、胸闷等异常时，停止训练并联系教练。"]
      : ["若疲劳明显上升，先降低训练总量而不是硬顶。"],
    citations: currentCitations(state),
    nextSteps: ["提交本周复盘给教练复核。", "下周开始先执行低风险版本，再根据状态追加负荷。"],
    providerLabel: "规则生成",
    disclaimer: "当前未配置外部模型或请求失败，展示本地规则生成结果。",
    usedFallback: true,
  };
}

function buildFallback(state: DemoState, mode: AssistantMode, message: string, options?: { mediaAttached?: boolean }) {
  if (mode === "plan") return planFallback(state, message);
  if (mode === "guidance") return guidanceFallback(state, message, options);
  return reviewFallback(state, message);
}

function buildModePrompt(mode: AssistantMode, settings: Record<string, string>) {
  if (mode === "plan") return settings["plan-system"] ?? "";
  if (mode === "guidance") return settings["guidance-system"] ?? "";
  return settings["review-system"] ?? "";
}

function buildUserContext(
  state: DemoState,
  mode: AssistantMode,
  message: string,
  options?: { attachment?: AssistantAttachment | null },
) {
  const enabledKnowledgeBase = state.knowledgeBase
    .filter((entry) => entry.enabled)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      category: entry.category,
    }));

  return JSON.stringify(
    {
      mode,
      userPrompt: message,
      memberProfile: state.memberProfile,
      weeklyPlan: state.weeklyPlan,
      latestReview: state.review,
      enabledKnowledgeBase,
      guidanceReference: mode === "guidance" ? guidanceBase : undefined,
      uploadedMedia:
        mode === "guidance" && options?.attachment
          ? {
              kind: options.attachment.kind,
              filename: options.attachment.filename,
              mimeType: options.attachment.mimeType,
              task: "请基于媒体中的动作表现，判断动作是否标准，并输出可执行的纠错建议。",
            }
          : undefined,
      outputContract: {
        title: "string",
        summary: "string",
        highlights: ["string"],
        trainingPlan: [{ dayLabel: "string", focus: "string", duration: "string", intensity: "string", note: "string" }],
        nutritionTips: ["string"],
        guidancePoints: ["string"],
        reviewInsights: ["string"],
        recoveryActions: ["string"],
        safetyFlags: ["string"],
        citations: [{ title: "string", source: "string", note: "string" }],
        nextSteps: ["string"],
      },
    },
    null,
    2,
  );
}

function normalizeResponse(
  payload: LlmResponsePayload,
  mode: AssistantMode,
  providerLabel: string,
): AssistantResponse {
  return {
    mode,
    title: String(payload.title ?? "助理建议"),
    summary: String(payload.summary ?? ""),
    highlights: asStringArray(payload.highlights),
    trainingPlan: asPlanArray(payload.trainingPlan),
    nutritionTips: asStringArray(payload.nutritionTips),
    guidancePoints: asStringArray(payload.guidancePoints),
    reviewInsights: asStringArray(payload.reviewInsights),
    recoveryActions: asStringArray(payload.recoveryActions),
    safetyFlags: asStringArray(payload.safetyFlags),
    citations: asCitationArray(payload.citations),
    nextSteps: asStringArray(payload.nextSteps),
    providerLabel,
    disclaimer: "当前结果由外部模型返回，仍建议由真人教练复核后执行。",
    usedFallback: false,
  };
}

async function callOpenAiCompatible(
  state: DemoState,
  mode: AssistantMode,
  message: string,
  settings: AssistantSettings,
  options?: { attachment?: AssistantAttachment | null },
) {
  const baseUrl = settings["llm-base-url"]?.trim();
  const apiKey = settings["llm-api-key"]?.trim();
  const model = settings["llm-model"]?.trim();
  const protocol = resolveProtocol(settings);
  const providerLabel = `${protocol} / ${model}`;

  if (!baseUrl || !apiKey || !model) {
    return buildFallback(state, mode, message, { mediaAttached: Boolean(options?.attachment) });
  }

  const isDashScopeProvider = isDashScope(baseUrl);
  const hasAttachment = Boolean(options?.attachment);
  const controller = new AbortController();
  const timeoutMs = 45000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    const temperature = 0.35;
    const systemPrompt = buildSystemPrompt(mode, settings);
    const userPrompt = buildUserContext(state, mode, message, { attachment: options?.attachment });
    const dashScopeCompatFields = isDashScopeProvider ? { enable_thinking: false } : {};

    const multimediaContent =
      options?.attachment && mode === "guidance"
        ? [
            options.attachment.kind === "image"
              ? {
                  type: "image_url",
                  image_url: {
                    url: options.attachment.dataUrl,
                  },
                }
              : {
                  type: "video_url",
                  video_url: {
                    url: options.attachment.dataUrl,
                  },
                },
            {
              type: "text",
              text: userPrompt,
            },
          ]
        : null;

    const requestProtocol = hasAttachment ? "openai-chat-completions" : protocol;
    const response =
      requestProtocol === "openai-responses"
        ? await fetch(`${trimBaseUrl(baseUrl)}/responses`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              temperature,
              input: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              ...dashScopeCompatFields,
            }),
            signal: controller.signal,
          })
        : await fetch(`${trimBaseUrl(baseUrl)}/chat/completions`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model,
              temperature,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: multimediaContent ?? userPrompt },
              ],
              ...dashScopeCompatFields,
            }),
            signal: controller.signal,
          });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(parseProviderError(response.status, bodyText));
    }

    const json = (await response.json()) as ChatCompletionsJson & ResponsesApiJson;
    const content =
      requestProtocol === "openai-responses"
        ? extractResponsesText(json)
        : extractChatText(json);
    if (!content) {
      throw new Error(`模型接口已返回响应，但 ${requestProtocol} 结果中没有可读取的文本内容。`);
    }

    let parsed: LlmResponsePayload;
    try {
      parsed = JSON.parse(extractJsonObject(content)) as LlmResponsePayload;
    } catch {
      throw new Error("模型已返回内容，但不是合法 JSON。请检查模型是否遵守 JSON 输出要求。");
    }
    const providerLabelForRequest = hasAttachment ? `openai-chat-completions / ${model}` : providerLabel;
    return normalizeResponse(parsed, mode, providerLabelForRequest);
  } catch (error) {
    throw parseAbortError(error, timeoutMs);
  } finally {
    clearTimeout(timeout);
  }
}

export function isAssistantConfigured(): boolean {
  const settings = loadSettings();
  return Boolean(settings["llm-base-url"] && settings["llm-api-key"] && settings["llm-model"]);
}

export function supportsMultimodal(): boolean {
  const settings = loadSettings();
  const model = (settings["llm-model"] ?? "").toLowerCase();
  const baseUrl = (settings["llm-base-url"] ?? "").toLowerCase();
  if (!model) return false;
  if (/dashscope\.aliyuncs\.com/.test(baseUrl)) {
    return true;
  }
  return /(gpt-4\.1|gpt-4o|gpt-4\.5|gpt-5|omni|vision|vl)/.test(model);
}

export async function runAssistant(request: AssistantRequest): Promise<AssistantResponse> {
  const state = staticDemoState();
  const settings = loadSettings();

  try {
    return await callOpenAiCompatible(state, request.mode, request.message, settings, {
      attachment: request.attachment,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fallback = buildFallback(state, request.mode, request.message, {
      mediaAttached: Boolean(request.attachment),
    });
    return {
      ...fallback,
      disclaimer: `外部模型调用失败，已回退到本地规则生成结果。错误原因：${errorMessage}`,
    };
  }
}
