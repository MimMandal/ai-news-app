"use client";

import { ReadMode } from "@/types/news";

const MODES: { id: ReadMode; label: string }[] = [
  { id: "Normal", label: "Normal" },
  { id: "Kids", label: "Kids" },
  { id: "GenZ", label: "GenZ" },
  { id: "Axios", label: "Axios" },
];

interface ModeSwitcherProps {
  mode: ReadMode;
  onChange: (mode: ReadMode) => void;
}

export default function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="switcher-group">
      <span className="switcher-label">Mode</span>
      <div className="switcher-options">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? "active" : ""}`}
            onClick={() => onChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
