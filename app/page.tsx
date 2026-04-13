"use client";

import Link from "next/link";
import { type TouchEvent, type WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import ArticleBody from "@/components/ArticleBody";
import SkeletonCard from "@/components/SkeletonCard";
import { formatNewsDate, getArticleSlug, getHostname, getSourceLabel, renderHeadline } from "@/lib/news";
import { Category, NewsItem, ReadMode, SupportedLanguage } from "@/types/news";

const BALANCED_TAG_ORDER = ["technology", "business", "politics", "sports", "entertainment"];
const CATEGORIES: Category[] = ["All", "Technology", "Sports", "Politics", "Entertainment", "Business"];
const MODES: { id: ReadMode; label: string; note: string }[] = [
  { id: "Normal", label: "Briefing", note: "Classic newsroom language with the full summary." },
  { id: "Kids", label: "Simple", note: "Softer vocabulary and easier pacing." },
  { id: "GenZ", label: "Internet", note: "More playful, quick-fire phrasing." },
  { id: "Axios", label: "Bullet", note: "Skimmable points with the takeaway first." },
];

type SheetType = "category" | "settings" | null;
type ToastState = { key: number; message: string } | null;
type FeedMeta = {
  items: NewsItem[];
  hasSelectedCategoryStories: boolean;
};

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

function parseMode(value: string | null): ReadMode {
  return value === "Kids" || value === "GenZ" || value === "Axios" ? value : "Normal";
}

function parseCategory(value: string | null): Category {
  return value === "Technology" || value === "Sports" || value === "Politics" || value === "Entertainment" || value === "Business"
    ? value
    : "All";
}

function parseLanguage(value: string | null): SupportedLanguage {
  return value === "hi" || value === "mr" || value === "bn" || value === "ta" || value === "te" ? value : "en";
}

function isCategoryMatch(item: NewsItem, category: Category) {
  if (category === "All") {
    return true;
  }

  return item.tags.some((tag) => tag.toLowerCase() === category.toLowerCase());
}

function buildFeed(items: NewsItem[], category: Category): FeedMeta {
  const balanced = balanceNewsDistribution(items);

  if (category === "All") {
    return {
      items: balanced,
      hasSelectedCategoryStories: true,
    };
  }

  const filtered = items
    .filter((item) => isCategoryMatch(item, category))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!filtered.length) {
    return {
      items: [],
      hasSelectedCategoryStories: false,
    };
  }

  return {
    items: filtered,
    hasSelectedCategoryStories: true,
  };
}

function canSwipeFromScroll(container: HTMLDivElement, deltaY: number) {
  const scrollable = container.scrollHeight - container.clientHeight > 12;

  if (!scrollable) {
    return true;
  }

  if (deltaY > 0) {
    return container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
  }

  if (deltaY < 0) {
    return container.scrollTop <= 2;
  }

  return false;
}

export default function Home() {
  const cardScrollRef = useRef<HTMLDivElement | null>(null);
  const cardScrollCallbackRef = (node: HTMLDivElement | null) => {
    cardScrollRef.current = node;
    if (node) {
      node.scrollTop = 0;
    }
  };
  const touchStartRef = useRef<number | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionLockRef = useRef(false);

  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReadMode>("Normal");
  const [category, setCategory] = useState<Category>("All");
  const [language, setLanguage] = useState<SupportedLanguage>("en");
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [toast, setToast] = useState<ToastState>(null);
  const [transition, setTransition] = useState<"next" | "prev" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(parseMode(params.get("mode")));
    setCategory(parseCategory(params.get("category")));
    setLanguage(parseLanguage(params.get("lang")));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNews() {
      const res = await fetch("/data/news.json");
      const data: NewsItem[] = await res.json();

      if (!cancelled) {
        setAllNews(data);
        setLoading(false);
      }
    }

    void loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  const feedMeta = useMemo(() => buildFeed(allNews, category), [allNews, category]);
  const feed = feedMeta.items;
  const currentItem = feed[currentIndex];

  const feedQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (mode !== "Normal") params.set("mode", mode);
    if (category !== "All") params.set("category", category);
    if (language !== "en") params.set("lang", language);
    return params.toString();
  }, [category, language, mode]);

  useEffect(() => {
    const nextUrl = feedQuery ? `/?${feedQuery}` : "/";
    window.history.replaceState(null, "", nextUrl);
  }, [feedQuery]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [category]);

  useEffect(() => {
    if (currentIndex >= feed.length && feed.length > 0) {
      setCurrentIndex(feed.length - 1);
    }
  }, [currentIndex, feed.length]);

  function showToast(message: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    setToast({ key: Date.now(), message });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 2600);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && category !== "All" && !feedMeta.hasSelectedCategoryStories) {
      showToast("No news available for this category right now.");
    }
  }, [category, feedMeta.hasSelectedCategoryStories, loading]);

  function moveCard(direction: "next" | "prev") {
    if (transitionLockRef.current) return;

    if (direction === "next") {
      if (currentIndex >= feed.length - 1) {
        showToast("You\u2019re at the end of the feed.");
        return;
      }
    } else {
      if (currentIndex <= 0) {
        return;
      }
    }

    transitionLockRef.current = true;
    setTransition(direction);
  }

  function handleAnimationEnd() {
    if (!transition) return;

    const nextIndex = transition === "next" ? currentIndex + 1 : currentIndex - 1;
    setCurrentIndex(nextIndex);
    setTransition(null);
    transitionLockRef.current = false;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    if (transitionLockRef.current) return;

    if (!canSwipeFromScroll(event.currentTarget, event.deltaY)) {
      return;
    }

    event.preventDefault();

    if (Math.abs(event.deltaY) < 14) {
      return;
    }

    moveCard(event.deltaY > 0 ? "next" : "prev");
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startY = touchStartRef.current;
    const endY = event.changedTouches[0]?.clientY;
    touchStartRef.current = null;

    if (startY == null || endY == null) {
      return;
    }

    const deltaY = startY - endY;

    if (Math.abs(deltaY) < 48 || !cardScrollRef.current || !canSwipeFromScroll(cardScrollRef.current, deltaY)) {
      return;
    }

    moveCard(deltaY > 0 ? "next" : "prev");
  }

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    setActiveSheet(null);
  }

  function selectMode(nextMode: ReadMode) {
    setMode(nextMode);
  }

  function renderCardContent(item: NewsItem, attachRef: boolean, attachHandlers: boolean) {
    return (
      <>
        <div className="reel-card-hero">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.headline}
              className="reel-card-image"
              onError={(event) => {
                const target = event.currentTarget;
                target.style.display = "none";
                target.parentElement?.setAttribute("data-image-failed", "true");
              }}
            />
          ) : null}
          <div className="reel-card-placeholder" data-visible={!item.image}>
            <span className="reel-card-placeholder-mark">{item.tags[0]?.slice(0, 1) || "N"}</span>
            <p>Image unavailable</p>
          </div>
        </div>

        <div
          ref={attachRef ? cardScrollCallbackRef : undefined}
          className="reel-card-scroll"
          onWheel={attachHandlers ? handleWheel : undefined}
          onTouchStart={attachHandlers ? handleTouchStart : undefined}
          onTouchEnd={attachHandlers ? handleTouchEnd : undefined}
        >
          <div className="reel-card-meta">
            <span>{formatNewsDate(item.date)}</span>
          </div>

          <h2 className="reel-card-title">{renderHeadline(item.headline, mode)}</h2>

          <div className="reel-article-body">
            <ArticleBody item={item} mode={mode} language={language} useFullBody />
          </div>

          <div className="reel-card-footer">
            <div className="reel-card-source">
              <span>{getSourceLabel(language)}</span>
              <strong>{getHostname(item.source_url)}</strong>
            </div>

            <div className="reel-card-actions">
              <Link
                href={`/article/${getArticleSlug(item)}${feedQuery ? `?${feedQuery}` : ""}`}
                className="reel-card-link"
              >
                Detail
              </Link>
              <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="reel-card-link primary">
                Source
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  const prevItem = feed[currentIndex - 1];
  const nextItem = feed[currentIndex + 1];

  const exitClass = transition === "next" ? "reel-card-exit-up" : transition === "prev" ? "reel-card-exit-down" : "";
  const enterClass = transition === "next" ? "reel-card-enter-up" : transition === "prev" ? "reel-card-enter-down" : "";
  const incomingItem = transition === "next" ? nextItem : transition === "prev" ? prevItem : null;

  return (
    <main className="reel-app">
      <div className="reel-viewport">
        {loading ? (
          <SkeletonCard />
        ) : currentItem ? (
          <>
            <article key={currentIndex} className={`reel-card ${exitClass}`}>
              {renderCardContent(currentItem, true, !transition)}
            </article>

            {transition && incomingItem && (
              <article
                className={`reel-card ${enterClass}`}
                onAnimationEnd={handleAnimationEnd}
              >
                {renderCardContent(incomingItem, false, false)}
              </article>
            )}
          </>
        ) : (
          <div className="empty-state reel-empty-state">
            <h2>No stories yet</h2>
            <p>Refresh the feed data and we&apos;ll show the newest briefings here.</p>
          </div>
        )}
      </div>

      <nav className="bottom-nav" aria-label="Feed controls">
        <button
          type="button"
          className={`bottom-nav-item ${category === "All" && !activeSheet ? "active" : ""}`}
          onClick={() => {
            setCategory("All");
            setActiveSheet(null);
          }}
          aria-label="Home"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSheet === "category" ? "active" : ""}`}
          onClick={() => setActiveSheet((value) => (value === "category" ? null : "category"))}
          aria-label="Category"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSheet === "settings" ? "active" : ""}`}
          onClick={() => setActiveSheet((value) => (value === "settings" ? null : "settings"))}
          aria-label="Settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" /></svg>
        </button>
      </nav>

      <div className={`sheet-backdrop ${activeSheet ? "visible" : ""}`} onClick={() => setActiveSheet(null)} aria-hidden={!activeSheet} />

      <section className={`bottom-sheet ${activeSheet ? "open" : ""}`} aria-hidden={!activeSheet}>
        {activeSheet === "category" ? (
          <>
            <div className="sheet-header">
              <div>
                <p className="sheet-kicker">Category</p>
                <h2>Choose what leads your feed.</h2>
              </div>
            </div>
            <div className="sheet-list">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`sheet-option ${category === item ? "active" : ""}`}
                  onClick={() => selectCategory(item)}
                >
                  <span>{item}</span>
                  <small>{item === "All" ? "Balanced mix across the full feed." : `Only ${item.toLowerCase()} stories.`}</small>
                </button>
              ))}
            </div>
          </>
        ) : activeSheet === "settings" ? (
          <>
            <div className="sheet-header">
              <div>
                <p className="sheet-kicker">Reading mode</p>
                <h2>Choose how the story is written.</h2>
              </div>
            </div>
            <div className="sheet-list">
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`sheet-option ${mode === item.id ? "active" : ""}`}
                  onClick={() => selectMode(item.id)}
                >
                  <span>{item.label}</span>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {toast ? (
        <div key={toast.key} className="toast">
          {toast.message}
        </div>
      ) : null}
    </main>
  );
}
