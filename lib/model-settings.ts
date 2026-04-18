import type { ModelSetting } from "@/lib/demo-types";

type ModelSettingDefinition = {
  id: string;
  label: string;
  defaultValue: string;
  group: string;
  helpText: string;
  inputType: "text" | "textarea" | "password";
  placeholder?: string;
  secret?: boolean;
};

export const modelSettingDefinitions: ModelSettingDefinition[] = [
  {
    id: "llm-provider",
    label: "调用协议",
    defaultValue: "auto",
    group: "连接配置",
    helpText: "支持 auto / openai-chat-completions / openai-responses。阿里百炼建议优先使用 openai-responses，auto 模式会自动为 DashScope 选择更合适的接口。",
    inputType: "text",
    placeholder: "auto",
  },
  {
    id: "llm-base-url",
    label: "Base URL",
    defaultValue: "https://api.openai.com/v1",
    group: "连接配置",
    helpText: "填写兼容 Chat Completions 的根地址，例如 https://api.openai.com/v1。",
    inputType: "text",
    placeholder: "https://api.openai.com/v1",
  },
  {
    id: "llm-api-key",
    label: "API Key",
    defaultValue: "",
    group: "连接配置",
    helpText: "仅管理员可见。未配置时系统会退回到本地规则生成结果。",
    inputType: "password",
    placeholder: "sk-...",
    secret: true,
  },
  {
    id: "llm-model",
    label: "模型名称",
    defaultValue: "",
    group: "连接配置",
    helpText: "例如 gpt-5.4、gpt-4.1-mini 或你的兼容模型名。",
    inputType: "text",
    placeholder: "gpt-5.4",
  },
  {
    id: "assistant-system",
    label: "通用系统提示词",
    defaultValue:
      "你是 PulseLab 健身房会员体系的智能健身助理。回答必须专业、保守、结构化、可执行。不诊断疾病，不编造不存在的知识库内容。涉及疼痛、眩晕、胸闷、旧伤、孕期、未成年人等风险信号时，必须明确停止训练或联系教练/专业机构的边界。",
    group: "提示词",
    helpText: "对三类任务共用的总规则。",
    inputType: "textarea",
  },
  {
    id: "plan-system",
    label: "计划生成提示词",
    defaultValue:
      "输出一周训练计划草案和简化饮食建议。计划必须结构化，优先可执行性和依从性；如果存在伤病或风险信号，先降风险再谈进阶。",
    group: "提示词",
    helpText: "用于训练计划和饮食建议。",
    inputType: "textarea",
  },
  {
    id: "guidance-system",
    label: "动作指导提示词",
    defaultValue:
      "输出动作要点、热身、放松、RPE/休息、风险提醒，并引用给定知识库条目。高风险内容必须保守处理。",
    group: "提示词",
    helpText: "用于动作指导与风险边界说明。",
    inputType: "textarea",
  },
  {
    id: "review-system",
    label: "复盘提示词",
    defaultValue:
      "结合完成率、疲劳、体重变化和主观反馈输出复盘结论，解释调整原因，并给出下周训练与恢复重点。",
    group: "提示词",
    helpText: "用于复盘和下周调整建议。",
    inputType: "textarea",
  },
];

const modelSettingMeta = new Map(modelSettingDefinitions.map((item) => [item.id, item]));

export function defaultModelSettings(): ModelSetting[] {
  return modelSettingDefinitions.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.defaultValue,
    group: item.group,
    helpText: item.helpText,
    inputType: item.inputType,
    placeholder: item.placeholder,
    secret: item.secret,
  }));
}

export function withModelSettingMeta(setting: ModelSetting, allowSecretValue: boolean): ModelSetting {
  const meta = modelSettingMeta.get(setting.id);
  if (!meta) {
    return setting;
  }

  const nextValue =
    meta.secret && !allowSecretValue ? (setting.value ? "••••••••已配置" : "") : setting.value;

  return {
    ...setting,
    value: nextValue,
    group: meta.group,
    helpText: meta.helpText,
    inputType: meta.inputType,
    placeholder: meta.placeholder,
    secret: meta.secret,
    label: meta.label,
  };
}

export function isAssistantReady(settings: ModelSetting[]) {
  const map = new Map(settings.map((item) => [item.id, item.value]));
  return Boolean(map.get("llm-base-url") && map.get("llm-api-key") && map.get("llm-model"));
}
