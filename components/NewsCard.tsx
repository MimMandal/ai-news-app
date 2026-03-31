"use client";

import { useState } from "react";
import { NewsItem, ReadMode } from "@/types/news";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80";

function transformBody(body: string, mode: ReadMode): React.ReactNode {
  if (mode === "Normal") {
    return <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: "1.7" }}>{body}</p>;
  }

  if (mode === "Kids") {
    // Simplify: shorter sentences, friendly language
    const simplified = body
      .replace(/\b(\d+(?:,\d+)*)\s*(?:crore|billion|million|lakh)\b/gi, "a very big number")
      .replace(/\b(?:inaugurated|unveiled|announced|announced)\b/gi, "showed everyone")
      .replace(/\b(?:approximately|approximately|estimated)\b/gi, "about")
      .replace(/\b(?:infrastructure|legislation|legislation)\b/gi, "buildings and roads")
      .split(". ")
      .slice(0, 3)
      .join(". ") + ".";

    return (
      <div>
        <div
          style={{
            background: "linear-gradient(135deg, #fff4e0, #ffe4f0)",
            borderRadius: "8px",
            padding: "10px 12px",
            marginBottom: "10px",
            fontSize: "12px",
            fontWeight: "600",
            color: "#8b6914",
          }}
        >
          🧒 Easy-read version — great for young readers!
        </div>
        <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: "1.7" }}>
          {simplified}
        </p>
      </div>
    );
  }

  if (mode === "GenZ") {
    const intros = [
      "okay but this is actually lowkey huge 👀 —",
      "no cap this slaps fr —",
      "POV: you finally understand the news 💀 —",
      "bestie, this is the vibe rn —",
      "not me being lowkey obsessed with this 😭 —",
    ];
    const intro = intros[Math.floor(body.length % intros.length)];

    // More aggressive slangification for GenZ mode (apply to the whole body)
    const replacements: [RegExp, string][] = [
      [/\bvery\b/gi, "absolutely"],
      [/\bgood\b/gi, "bussin'"],
      [/\bimportant\b/gi, "a whole moment"],
      [/\bsignificant\b/gi, "no cap significant"],
      [/\bsuccessfully\b/gi, "ate and left no crumbs"],
      [/\bwill be\b/gi, "gonna be"],
      [/\bwill\b/gi, "gonna"],
      [/\bis not\b/gi, "isn't"],
      [/\bare not\b/gi, "aren't"],
      [/\bconfirmed\b/gi, "confirmed (big flex)"],
      [/\bannounced\b/gi, "announced, lowkey"],
      [/\b announced\b/gi, "announced, lowkey"],
      [/\bpercent\b/gi, "%"],
      [/\bapproximately\b/gi, "about"],
      [/\bin the\b/gi, "in the"],
      [/\bIndia\b/gi, "India"],
      [/\b(ISRO)\b/gi, "ISRO (space pog)"],
    ];

    let genzBody = body;
    for (const [re, sub] of replacements) genzBody = genzBody.replace(re, sub);
    // shorten long paragraphs a bit and add emojis for tone
    genzBody = genzBody
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        // keep paragraph but add a vibe emoji and occasionally trim
        const trimmed = p.length > 220 ? p.slice(0, 200).trim() + "..." : p;
        return trimmed + (Math.random() > 0.7 ? " ✨" : "");
      })
      .join("\n\n");

    return (
      <div>
        <div
          style={{
            background: "linear-gradient(135deg, #1a0a2e, #16213e)",
            borderRadius: "8px",
            padding: "8px 12px",
            marginBottom: "10px",
            fontSize: "11px",
            fontWeight: "700",
            color: "#a855f7",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          ✨ GenZ Mode
        </div>
        <p style={{ fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: "1.7" }}>
          <span style={{ fontWeight: "700", color: "var(--accent)" }}>{intro}</span> {genzBody} <span style={{ marginLeft: 6 }}>✨</span>
        </p>
      </div>
    );
  }

  if (mode === "Axios") {
    // Convert to bullet points — split on period or semicolons
    const sentences = body
      .split(/(?<=[.;])\s+/)
      .filter((s) => s.trim().length > 20)
      .slice(0, 5);

    return (
      <div>
        <div
          style={{
            marginBottom: "8px",
            fontSize: "11px",
            fontWeight: "700",
            color: "var(--accent)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          The Bottom Line
        </div>
        <ul className="axios-list">
          {sentences.map((sentence, i) => (
            <li key={i}>{sentence.replace(/^[.;]\s*/, "").trim()}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function transformHeadline(headline: string, mode: ReadMode): string {
  if (mode !== "GenZ") return headline;

  let h = headline
    .replace(/\b(India)\b/gi, "$1")
    .replace(/\b(ISRO)\b/gi, "ISRO")
    .replace(/\b(Budget)\b/gi, "Budget")
    .replace(/\b(Launches|Launch|Launches)\b/gi, "drops")
    .replace(/\b(Successfully|successfully)\b/gi, "ate")
    .replace(/\b(World|world)\b/gi, "world")
    .trim();

  // Add a short GenZ prefix/suffix
  const prefixes = ["lowkey:", "not gonna lie:", "fr:", "hot take:", "real talk:"];
  const prefix = prefixes[headline.length % prefixes.length];

  return `${prefix} ${h} — ${["🔥", "👀", "✨"][headline.length % 3]}`;
}

interface NewsCardProps {
  item: NewsItem;
  mode: ReadMode;
  style?: React.CSSProperties;
}

export default function NewsCard({ item, mode, style }: NewsCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="news-card" style={style}>
      {/* Image */}
      <div style={{ position: "relative", overflow: "hidden", aspectRatio: "16/9", flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgError ? FALLBACK_IMAGE : item.image || FALLBACK_IMAGE}
          alt={item.headline}
          loading="lazy"
          onError={() => setImgError(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transition: "transform 0.4s ease",
          }}
          className="card-img"
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 100%)",
            pointerEvents: "none",
          }}
        />
        {/* Tags on image */}
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {item.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "10px",
                fontWeight: "700",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: "4px",
                background: "rgba(0,0,0,0.55)",
                color: "white",
                backdropFilter: "blur(4px)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
        {/* Provider + Date */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--accent)",
            }}
          >
            AI Curated
          </span>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {formatDate(item.date)}
          </span>
        </div>

        {/* Headline */}
        <h2
          className="news-card-title"
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "18px",
            fontWeight: "700",
            lineHeight: "1.35",
            color: "var(--text-primary)",
            marginBottom: "12px",
            letterSpacing: "-0.01em",
          }}
        >
          {transformHeadline(item.headline, mode)}
        </h2>

        {/* Divider */}
        <div
          style={{
            width: "32px",
            height: "2px",
            background: "var(--accent)",
            borderRadius: "2px",
            marginBottom: "12px",
          }}
        />

        {/* Body / transformed content */}
        <div className="news-card-body" style={{ marginBottom: "16px", flex: 1, minHeight: 0 }}>
          {transformBody(item.body, mode)}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "14px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <a
            href={item.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="read-more"
          >
            Read original
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <div style={{ display: "flex", gap: "6px" }}>
            {item.tags.map((tag) => (
              <span key={tag} className="tag-badge">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .news-card-title {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        }

        .news-card-body :global(p) {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 7;
          overflow: hidden;
        }

        .news-card-body :global(.axios-list) {
          max-height: 210px;
          overflow: hidden;
        }

        .news-card:hover .card-img {
          transform: scale(1.03);
        }
      `}</style>
    </article>
  );
}
