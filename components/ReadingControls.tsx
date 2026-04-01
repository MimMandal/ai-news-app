"use client";

import LanguageSwitcher from "@/components/LanguageSwitcher";
import ModeSwitcher from "@/components/ModeSwitcher";
import { ReadMode, SupportedLanguage } from "@/types/news";

interface ReadingControlsProps {
  mode: ReadMode;
  language: SupportedLanguage;
  onModeChange: (mode: ReadMode) => void;
  onLanguageChange: (language: SupportedLanguage) => void;
}

export default function ReadingControls({
  mode,
  language,
  onModeChange,
  onLanguageChange,
}: ReadingControlsProps) {
  return (
    <div className="reading-controls">
      <ModeSwitcher mode={mode} onChange={onModeChange} />
      <LanguageSwitcher value={language} onChange={onLanguageChange} />
    </div>
  );
}
