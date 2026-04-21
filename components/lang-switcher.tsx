"use client";

import { useI18n, type Locale } from "@/lib/i18n";

const labels: Record<Locale, string> = {
  "zh-CN": "简",
  "zh-TW": "繁",
  en: "EN",
};

const order: Locale[] = ["zh-CN", "zh-TW", "en"];

export function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {order.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={l === locale ? "lang-btn lang-btn-active" : "lang-btn"}
          aria-pressed={l === locale}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}
