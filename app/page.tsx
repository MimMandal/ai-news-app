"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Navbar from "@/components/Navbar";
import NewsCard from "@/components/NewsCard";
import ModeSwitcher from "@/components/ModeSwitcher";
import CategoryFilter from "@/components/CategoryFilter";
import SkeletonCard from "@/components/SkeletonCard";
import { NewsItem, ReadMode, Category } from "@/types/news";

const PAGE_SIZE = 6;
const BALANCED_TAG_ORDER = [
  "technology",
  "business",
  "politics",
  "sports",
  "entertainment",
];

function getPrimaryTag(item: NewsItem): string {
  return item.tags.find((tag) => BALANCED_TAG_ORDER.includes(tag.toLowerCase()))?.toLowerCase()
    || item.tags[0]?.toLowerCase()
    || "other";
}

function balanceNewsDistribution(items: NewsItem[]): NewsItem[] {
  const buckets = new Map<string, NewsItem[]>();

  for (const tag of BALANCED_TAG_ORDER) {
    buckets.set(tag, []);
  }

  for (const item of items) {
    const primaryTag = getPrimaryTag(item);
    if (!buckets.has(primaryTag)) {
      buckets.set(primaryTag, []);
    }
    buckets.get(primaryTag)?.push(item);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const orderedTags = [
    ...BALANCED_TAG_ORDER,
    ...Array.from(buckets.keys()).filter((tag) => !BALANCED_TAG_ORDER.includes(tag)),
  ];
  const balanced: NewsItem[] = [];

  while (balanced.length < items.length) {
    let addedInRound = false;

    for (const tag of orderedTags) {
      const nextItem = buckets.get(tag)?.shift();
      if (!nextItem) continue;

      balanced.push(nextItem);
      addedInRound = true;
    }

    if (!addedInRound) {
      break;
    }
  }

  return balanced;
}

export default function Home() {
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<ReadMode>("Normal");
  const [category, setCategory] = useState<Category>("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    // Simulate async load
    const timer = setTimeout(async () => {
      const res = await fetch("/data/news.json");
      const data: NewsItem[] = await res.json();
      setAllNews(data);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let items = allNews;

    // Category filter
    if (category !== "All") {
      items = items.filter((n) =>
        n.tags.some((t) => t.toLowerCase() === category.toLowerCase())
      );
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((n) => n.headline.toLowerCase().includes(q));
    }

    if (category === "All" && !search.trim()) {
      return balanceNewsDistribution(items);
    }

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allNews, category, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((c) => c + PAGE_SIZE);
  }, []);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, category]);

  return (
    <>
      <Navbar search={search} onSearch={setSearch} />

      <main
        style={{
          paddingTop: "80px",
          minHeight: "100vh",
          background: "var(--bg)",
        }}
      >
        {/* Hero bar */}
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-card)",
            padding: "0",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 24px",
              height: "48px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--accent)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              Breaking
            </span>
            <span
              style={{
                width: "1px",
                height: "16px",
                background: "var(--border)",
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {allNews[0]?.headline || "Loading latest headlines..."}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "24px 24px 0",
          }}
        >
          {/* Top section */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "28px",
                  fontWeight: "900",
                  letterSpacing: "-0.03em",
                  color: "var(--text-primary)",
                  lineHeight: 1.1,
                }}
              >
                Today's Headlines
              </h1>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                {loading
                  ? "Loading..."
                  : `${filtered.length} stories · AI-curated`}
              </p>
            </div>
            <ModeSwitcher mode={mode} onChange={setMode} />
          </div>

          {/* Category filter */}
          <CategoryFilter selected={category} onChange={setCategory} />

          {/* Mode description */}
          {mode !== "Normal" && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 14px",
                borderRadius: "8px",
                background: "var(--tag-bg)",
                fontSize: "13px",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>
                {mode === "Kids" && "🧒 Kid-friendly mode — simplified language for younger readers"}
                {mode === "GenZ" && "🔥 GenZ mode — news the way the internet actually talks"}
                {mode === "Axios" && "→ Axios mode — key points only, no fluff"}
              </span>
            </div>
          )}
        </div>

        {/* News Grid */}
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "24px",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: "24px",
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 24px",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "22px",
                  color: "var(--text-secondary)",
                  marginBottom: "8px",
                }}
              >
                No stories found
              </h3>
              <p style={{ fontSize: "14px" }}>
                Try a different search term or category
              </p>
            </div>
          ) : (
            <>
              <div
                className="stagger-children"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  gap: "24px",
                }}
              >
                {visible.map((item, i) => (
                  <NewsCard key={`${item.headline}-${i}`} item={item} mode={mode} />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "40px",
                  }}
                >
                  <button
                    onClick={handleLoadMore}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "14px",
                      fontWeight: "600",
                      padding: "12px 32px",
                      borderRadius: "999px",
                      background: "transparent",
                      border: "2px solid var(--border)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      letterSpacing: "0.02em",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.borderColor = "var(--accent)";
                      (e.target as HTMLButtonElement).style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.borderColor = "var(--border)";
                      (e.target as HTMLButtonElement).style.color = "var(--text-primary)";
                    }}
                  >
                    Load more stories →
                  </button>
                  <p
                    style={{
                      marginTop: "10px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Showing {visible.length} of {filtered.length}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "32px 24px",
            marginTop: "40px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "var(--text-primary)",
                }}
              >
                AI<span style={{ color: "var(--accent)" }}>News</span>
              </span>
              <span style={{ color: "var(--border)" }}>·</span>
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                Powered by Gemini · Updated via GitHub Actions
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              News is AI-curated and may not reflect the complete picture. Always verify with original sources.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
