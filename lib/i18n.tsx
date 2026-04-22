"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "zh-CN" | "zh-TW" | "en";

type Dict = Record<string, string>;

const dicts: Record<Locale, Dict> = {
  "zh-CN": {
    brand: "训练助理",
    brand_sub: "训练助理",
    greeting: "今天健身了嘛？",
    greeting_sub: "「动作追踪」上传视频即可骨架识别与深蹲计数；「训练计划」仍可生成安排。",
    ask: "提问",
    result: "建议",
    scenario: "场景",
    mode_plan: "训练计划",
    mode_guidance: "动作追踪",
    mode_review: "复盘调整",
    common_questions: "常用提问",
    your_question: "你的问题",
    placeholder: "具体描述目标、限制、近期情况…",
    upload_title: "上传动作素材（可选）",
    kind_image: "图片",
    kind_video: "视频",
    pick_image: "选择一张动作照片",
    pick_video: "选择一个动作视频",
    replace_video: "更换视频",
    image_hint: "jpg / png / webp",
    video_hint: "mp4 / mov / webm · ≤ 16MB",
    remove_media: "移除素材",
    generate: "生成建议",
    generating: "生成中…",
    track_start: "开始追踪",
    track_stop: "停止追踪",
    tracking: "追踪中…",
    scan_status: "AI 姿态识别中…",
    pose_loading: "AI 姿态模型加载中…",
    pose_tracking: "实时姿态追踪中…",
    biomech_knee_flex: "膝屈角",
    biomech_hip_ref: "髋参考线",
    scan_stage_parse: "解析视频",
    scan_stage_detect: "定位骨架",
    scan_stage_motion: "识别动作",
    scan_stage_advice: "生成建议",
    empty: "输入问题后，结果会显示在这里。",
    source_fallback: "规则生成",
    sec_highlights: "重点",
    sec_plan: "训练计划",
    sec_guidance: "动作要点",
    sec_nutrition: "饮食建议",
    sec_review: "复盘结论",
    sec_next: "接下来",
    sec_safety: "风险提醒",
    sec_steps: "后续步骤",
    sec_cite: "参考来源",
  },
  "zh-TW": {
    brand: "訓練助理",
    brand_sub: "訓練助理",
    greeting: "今天健身了嗎？",
    greeting_sub: "「動作追蹤」上傳影片即可骨架辨識與深蹲計次；「訓練計劃」仍可生成安排。",
    ask: "提問",
    result: "建議",
    scenario: "場景",
    mode_plan: "訓練計劃",
    mode_guidance: "動作追蹤",
    mode_review: "覆盤調整",
    common_questions: "常用提問",
    your_question: "你的問題",
    placeholder: "具體描述目標、限制、近期情況…",
    upload_title: "上傳動作素材（可選）",
    kind_image: "圖片",
    kind_video: "影片",
    pick_image: "選擇一張動作照片",
    pick_video: "選擇一個動作影片",
    replace_video: "更換影片",
    image_hint: "jpg / png / webp",
    video_hint: "mp4 / mov / webm · ≤ 16MB",
    remove_media: "移除素材",
    generate: "生成建議",
    generating: "生成中…",
    track_start: "開始追蹤",
    track_stop: "停止追蹤",
    tracking: "追蹤中…",
    scan_status: "AI 姿態識別中…",
    pose_loading: "AI 姿態模型載入中…",
    pose_tracking: "即時姿態追蹤中…",
    biomech_knee_flex: "膝屈角",
    biomech_hip_ref: "髖參考線",
    scan_stage_parse: "解析影片",
    scan_stage_detect: "定位骨架",
    scan_stage_motion: "識別動作",
    scan_stage_advice: "生成建議",
    empty: "輸入問題後，結果會顯示在這裡。",
    source_fallback: "規則生成",
    sec_highlights: "重點",
    sec_plan: "訓練計劃",
    sec_guidance: "動作要點",
    sec_nutrition: "飲食建議",
    sec_review: "覆盤結論",
    sec_next: "接下來",
    sec_safety: "風險提醒",
    sec_steps: "後續步驟",
    sec_cite: "參考來源",
  },
  en: {
    brand: "Training",
    brand_sub: "Training",
    greeting: "Did you train today?",
    greeting_sub: "Track: upload a clip for live pose + squat reps. Plan: generate a schedule in the other tab.",
    ask: "Ask",
    result: "Result",
    scenario: "Scenario",
    mode_plan: "Plan",
    mode_guidance: "Track",
    mode_review: "Review",
    common_questions: "Quick prompts",
    your_question: "Your question",
    placeholder: "Describe goals, limits, recent status…",
    upload_title: "Upload media (optional)",
    kind_image: "Image",
    kind_video: "Video",
    pick_image: "Pick a photo",
    pick_video: "Pick a video",
    replace_video: "Replace video",
    image_hint: "jpg / png / webp",
    video_hint: "mp4 / mov / webm · ≤ 16MB",
    remove_media: "Remove",
    generate: "Generate",
    generating: "Generating…",
    track_start: "Start tracking",
    track_stop: "Stop",
    tracking: "Tracking…",
    scan_status: "AI pose scanning…",
    pose_loading: "Loading pose AI…",
    pose_tracking: "Live pose tracking…",
    biomech_knee_flex: "Knee flex",
    biomech_hip_ref: "Hip line",
    scan_stage_parse: "Parse video",
    scan_stage_detect: "Detect body",
    scan_stage_motion: "Identify motion",
    scan_stage_advice: "Generate advice",
    empty: "Your suggestions will appear here.",
    source_fallback: "Fallback",
    sec_highlights: "Highlights",
    sec_plan: "Plan",
    sec_guidance: "Form cues",
    sec_nutrition: "Nutrition",
    sec_review: "Review",
    sec_next: "Next",
    sec_safety: "Safety",
    sec_steps: "Steps",
    sec_cite: "Sources",
  },
};

export const presetTexts: Record<Locale, Record<"plan" | "guidance" | "review", string[]>> = {
  "zh-CN": {
    plan: [
      "结合我的目标和膝盖情况，生成一周训练计划。",
      "最近工作较忙，请把计划做得更容易坚持。",
    ],
    guidance: [
      "我今天要做罗马尼亚硬拉，请给我动作要点与风险提醒。",
      "训练中出现下背不适，应该怎么处理？",
    ],
    review: [
      "本周完成 3 次训练，略疲劳，请帮我复盘并给出下周调整。",
      "根据最近训练和体重变化，下周该怎么调？",
    ],
  },
  "zh-TW": {
    plan: [
      "結合我的目標和膝蓋情況，生成一週訓練計劃。",
      "最近工作較忙，請把計劃做得更容易堅持。",
    ],
    guidance: [
      "我今天要做羅馬尼亞硬拉，請給我動作要點與風險提醒。",
      "訓練中出現下背不適，應該怎麼處理？",
    ],
    review: [
      "本週完成 3 次訓練，略疲勞，請幫我覆盤並給出下週調整。",
      "根據最近訓練和體重變化，下週該怎麼調？",
    ],
  },
  en: {
    plan: [
      "Give me a one-week plan considering my goal and knee issue.",
      "I'm busy recently, make the plan easy to stick to.",
    ],
    guidance: [
      "I'm doing Romanian deadlifts today — cues, warmup, and risk points?",
      "Lower back feels off during training — how should I handle it?",
    ],
    review: [
      "Completed 3 sessions this week, a bit tired — review and adjust next week.",
      "Based on recent training and weight, how should next week be tuned?",
    ],
  },
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof dicts["zh-CN"]) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = "yuni_locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh-CN");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && saved in dicts) {
        setLocaleState(saved);
      } else if (typeof navigator !== "undefined") {
        const nav = navigator.language.toLowerCase();
        if (nav.startsWith("zh-tw") || nav.startsWith("zh-hk") || nav.startsWith("zh-hant")) {
          setLocaleState("zh-TW");
        } else if (nav.startsWith("en")) {
          setLocaleState("en");
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => dicts[locale][key] ?? dicts["zh-CN"][key] ?? key,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
