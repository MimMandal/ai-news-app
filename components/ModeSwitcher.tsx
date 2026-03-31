"use client";

import { ReadMode } from "@/types/news";

const MODES: { id: ReadMode; label: string; emoji: string }[] = [
  { id: "Normal", label: "Normal", emoji: "📄" },
  { id: "Kids", label: "Kids", emoji: "🧒" },
  { id: "GenZ", label: "GenZ", emoji: "🔥" },
  { id: "Axios", label: "Axios", emoji: "→" },
];

interface ModeSwitcherProps {
  mode: ReadMode;
  onChange: (mode: ReadMode) => void;
}

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: "600",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginRight: "4px",
        }}
      >
        Mode
      </span>
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`mode-btn ${mode === m.id ? "active" : ""}`}
          onClick={() => onChange(m.id)}
        >
          {m.emoji} {m.label}
        </button>
      ))}
    </div>
  );
}
