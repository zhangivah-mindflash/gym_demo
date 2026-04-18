"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { StaffLayout } from "@/components/staff-layout";
import { useDemo } from "@/lib/demo-store";
import type { ModelSetting } from "@/lib/demo-types";
import { isAssistantReady } from "@/lib/model-settings";

export default function ModelSettingsPage() {
  const {
    state: { session, modelSettings },
    updateModelSetting,
    isSaving,
    isBootstrapped,
  } = useDemo();
  const router = useRouter();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingMultimodal, setIsTestingMultimodal] = useState(false);

  useEffect(() => {
    setDraft(
      Object.fromEntries(modelSettings.map((setting) => [setting.id, setting.secret && setting.value.startsWith("••••") ? "" : setting.value])),
    );
  }, [modelSettings]);

  useEffect(() => {
    if (!isBootstrapped) return;
    if (!session.isAuthenticated) router.replace("/login");
    if (session.role && session.role !== "admin") router.replace(`/${session.role}`);
  }, [isBootstrapped, session.isAuthenticated, session.role, router]);

  const groupedSettings = useMemo(() => {
    const groups = new Map<string, ModelSetting[]>();
    modelSettings.forEach((setting) => {
      const group = setting.group ?? "其他";
      const current = groups.get(group) ?? [];
      current.push(setting);
      groups.set(group, current);
    });
    return Array.from(groups.entries());
  }, [modelSettings]);

  const assistantReady = useMemo(() => isAssistantReady(modelSettings), [modelSettings]);

  async function saveAllSettings() {
    for (const setting of modelSettings) {
      const nextValue = draft[setting.id] ?? "";
      const currentValue = setting.secret && setting.value.startsWith("••••") ? "" : setting.value;
      if (nextValue !== currentValue) {
        await updateModelSetting(setting.id, nextValue);
      }
    }
  }

  async function testCurrentModel(testType: "text" | "multimodal") {
    if (testType === "text") {
      setIsTesting(true);
    } else {
      setIsTestingMultimodal(true);
    }

    try {
      const config = Object.fromEntries(
        modelSettings.flatMap((setting) => {
          const nextValue = draft[setting.id];

          if (setting.secret) {
            if (nextValue && nextValue.trim()) {
              return [[setting.id, nextValue]];
            }
            return [];
          }

          return [[setting.id, nextValue ?? ""]];
        }),
      );

      const response = await fetch("/api/assistant/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, testType }),
      });

      const json = (await response.json()) as { ok?: boolean; message?: string; error?: string };
      const message = json.message ?? json.error ?? "模型测试失败。";

      if (response.ok && json.ok) {
        await saveAllSettings();
        window.alert(`${message}\n\n当前页面配置已自动保存，member 端会使用这组已保存配置。`);
        return;
      }

      window.alert(`模型测试失败：${message}`);
    } catch (error) {
      window.alert(`模型测试失败：${error instanceof Error ? error.message : "请求异常"}`);
    } finally {
      if (testType === "text") {
        setIsTesting(false);
      } else {
        setIsTestingMultimodal(false);
      }
    }
  }

  return (
    <StaffLayout currentPath="/admin/model-settings" role="admin">
      <section className="staff-header">
        <div>
          <p className="eyebrow">模型配置</p>
          <h1>LLM 连接与提示词</h1>
          <p>管理员在这里配置外部模型的 `Base URL / API Key / 模型名`。会员端 AI 助理会优先读取这里的设置；未配置时，系统回退到本地规则生成结果。</p>
        </div>
        <div className="intro-badges">
          <span className={assistantReady ? "badge-accent" : "badge-neutral"}>{assistantReady ? "外部模型已可用" : "当前未完成连接"}</span>
        </div>
      </section>

      <section className="panel">
        <div className="assistant-results">
          {groupedSettings.map(([group, settings]) => (
            <article className="panel" key={group}>
              <div className="panel-header">
                <div><p className="eyebrow">{group}</p><h2>{group === "连接配置" ? "连接外部 LLM" : "配置输出风格"}</h2></div>
              </div>
              <div className="bullet-stack">
                {settings.map((setting) => {
                  const value = draft[setting.id] ?? "";
                  const commonProps = {
                    value,
                    placeholder: setting.placeholder,
                    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      setDraft((current) => ({ ...current, [setting.id]: event.target.value })),
                  };

                  return (
                    <label className="field" key={setting.id}>
                      <span>{setting.label}</span>
                      {setting.inputType === "textarea" ? (
                        <textarea rows={5} {...commonProps} />
                      ) : (
                        <input type={setting.inputType === "password" ? "password" : "text"} {...commonProps} />
                      )}
                      {setting.helpText ? <p className="helper-text">{setting.helpText}</p> : null}
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
        <div className="submit-row" style={{ marginTop: 20 }}>
          <button className="button-primary" disabled={isSaving} onClick={() => void saveAllSettings()} type="button">
            保存模型配置
          </button>
          <button className="button-secondary" disabled={isSaving || isTesting} onClick={() => void testCurrentModel("text")} type="button">
            {isTesting ? "测试中..." : "测试文本模型"}
          </button>
          <button
            className="button-secondary"
            disabled={isSaving || isTestingMultimodal}
            onClick={() => void testCurrentModel("multimodal")}
            type="button"
          >
            {isTestingMultimodal ? "测试中..." : "测试多模态模型"}
          </button>
          <span className="helper-text">文本测试校验普通生成链路；多模态测试会额外校验图片和视频输入。当前版本支持 `openai-chat-completions` 与 `openai-responses`；阿里百炼建议优先用 `auto`。</span>
        </div>
      </section>
    </StaffLayout>
  );
}
