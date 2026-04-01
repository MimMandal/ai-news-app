"use client";

import { LANGUAGE_LABELS } from "@/lib/news";
import { SupportedLanguage } from "@/types/news";

const LANGUAGES = Object.entries(LANGUAGE_LABELS) as [SupportedLanguage, string][];

interface LanguageSwitcherProps {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
}

export default function LanguageSwitcher({ value, onChange }: LanguageSwitcherProps) {
  return (
    <div className="switcher-group">
      <span className="switcher-label">Language</span>
      <div className="switcher-options">
        {LANGUAGES.map(([code, label]) => (
          <button
            key={code}
            className={`lang-btn ${value === code ? "active" : ""}`}
            onClick={() => onChange(code)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
