"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

interface NavbarProps {
  search: string;
  onSearch: (value: string) => void;
}

export default function Navbar({ search, onSearch }: NavbarProps) {
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollY = useRef(0);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHidden(currentScrollY > lastScrollY.current && currentScrollY > 80);
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`navbar fixed top-0 left-0 right-0 z-50 ${hidden ? "navbar-hidden" : ""}`}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 20px",
          minHeight: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "var(--accent)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              fontWeight: 700,
              color: "white",
            }}
          >
            AN
          </div>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "20px",
              fontWeight: "700",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            AI<span style={{ color: "var(--accent)" }}>News</span>
          </span>
        </div>

        <div style={{ position: "relative", flex: "0 1 auto" }}>
          <svg
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search headlines..."
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            aria-label="Search news"
          />
        </div>

        <button
          className="theme-toggle"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {mounted ? (resolvedTheme === "dark" ? "Li" : "Da") : "Da"}
        </button>
      </div>
    </header>
  );
}
