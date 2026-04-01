"use client";

import Link from "next/link";
import { type TouchEvent, type WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import ArticleBody from "@/components/ArticleBody";
import SkeletonCard from "@/components/SkeletonCard";
import { formatNewsDate, getArticleSlug, getModeDescription, getHostname, getSourceLabel, renderHeadline } from "@/lib/news";
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
type SwipeDirection = "next" | "prev";
type ToastState = { key: number; message: string } | null;
type FeedMeta = {
  items: NewsItem[];
  prioritizedCount: number;
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
      prioritizedCount: 0,
      hasSelectedCategoryStories: true,
    };
  }

  const prioritized = items
    .filter((item) => isCategoryMatch(item, category))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (!prioritized.length) {
    return {
      items: balanced,
      prioritizedCount: 0,
      hasSelectedCategoryStories: false,
    };
  }

  const prioritizedKeys = new Set(prioritized.map((item) => `${item.headline}-${item.source_url}`));
  const remaining = balanced.filter((item) => !prioritizedKeys.has(`${item.headline}-${item.source_url}`));

  return {
    items: [...prioritized, ...remaining],
    prioritizedCount: prioritized.length,
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
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const cardScrollRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<number | null>(null);
  const normalFeedToastShownRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ReadMode>(() => parseMode(searchParams.get("mode")));
  const [category, setCategory] = useState<Category>(() => parseCategory(searchParams.get("category")));
  const [language] = useState<SupportedLanguage>(() => parseLanguage(searchParams.get("lang")));
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationDirection, setAnimationDirection] = useState<SwipeDirection>("next");
  const [toast, setToast] = useState<ToastState>(null);

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
  const modeDescription = getModeDescription(mode, language);

  const feedQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (mode !== "Normal") params.set("mode", mode);
    if (category !== "All") params.set("category", category);
    if (language !== "en") params.set("lang", language);
    return params.toString();
  }, [category, language, mode]);

  useEffect(() => {
    const nextUrl = feedQuery ? `${pathname}?${feedQuery}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [feedQuery, pathname]);

  useEffect(() => {
    setCurrentIndex(0);
    normalFeedToastShownRef.current = false;
    if (cardScrollRef.current) {
      cardScrollRef.current.scrollTop = 0;
    }
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
      showToast("No news available for this category right now. Showing the latest feed instead.");
    }
  }, [category, feedMeta.hasSelectedCategoryStories, loading]);

  useEffect(() => {
    if (
      category !== "All"
      && feedMeta.prioritizedCount > 0
      && currentIndex >= feedMeta.prioritizedCount
      && !normalFeedToastShownRef.current
    ) {
      normalFeedToastShownRef.current = true;
      showToast("Back to the normal feed now.");
    }
  }, [category, currentIndex, feedMeta.prioritizedCount]);

  function moveCard(direction: SwipeDirection) {
    if (direction === "next") {
      if (currentIndex >= feed.length - 1) {
        showToast("You're at the end of the feed.");
        return;
      }

      setAnimationDirection("next");
      setCurrentIndex((value) => value + 1);
    } else {
      if (currentIndex <= 0) {
        return;
      }

      setAnimationDirection("prev");
      setCurrentIndex((value) => value - 1);
    }

    requestAnimationFrame(() => {
      if (cardScrollRef.current) {
        cardScrollRef.current.scrollTop = 0;
      }
    });
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
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
    setActiveSheet(null);
  }

  return (
    <main className="reel-app">
      <div className="reel-shell">
        <header className="reel-topbar">
          <div>
            <p className="reel-kicker">AI News</p>
          
          </div>
          <div className="reel-status">
            <span>{loading ? "Refreshing" : `${currentIndex + 1} / ${Math.max(feed.length, 1)}`}</span>
            <span>{category === "All" ? "For you" : category}</span>
          </div>
        </header>

        <section className="reel-stage">
          {loading ? (
            <SkeletonCard />
          ) : currentItem ? (
            <article className={`reel-card reel-card-${animationDirection}`} key={`${getArticleSlug(currentItem)}-${currentIndex}`}>
              <div className="reel-card-hero">
                {currentItem.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentItem.image}
                    alt={currentItem.headline}
                    className="reel-card-image"
                    onError={(event) => {
                      const target = event.currentTarget;
                      target.style.display = "none";
                      target.parentElement?.setAttribute("data-image-failed", "true");
                    }}
                  />
                ) : null}
                <div className="reel-card-placeholder" data-visible={!currentItem.image}>
                  <span className="reel-card-placeholder-mark">{currentItem.tags[0]?.slice(0, 1) || "N"}</span>
                  <p>Image unavailable</p>
                </div>
              </div>

              <div
                ref={cardScrollRef}
                className="reel-card-content"
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="reel-card-meta">
                  <span className="meta-accent">Top story</span>
                  <span>{formatNewsDate(currentItem.date)}</span>
                </div>

                <h2 className="reel-card-title">{renderHeadline(currentItem.headline, mode)}</h2>

                <p className="reel-card-dek">
                  {modeDescription || "Swipe up for the next story. Long cards will scroll first, then advance."}
                </p>

                <div className="reel-article-body">
                  <ArticleBody item={currentItem} mode={mode} language={language} useFullBody />
                </div>

                <div className="reel-card-footer">
                  <div className="reel-card-source">
                    <span>{getSourceLabel(language)}</span>
                    <strong>{getHostname(currentItem.source_url)}</strong>
                  </div>

                  <div className="reel-card-actions">
                    <Link
                      href={`/article/${getArticleSlug(currentItem)}${feedQuery ? `?${feedQuery}` : ""}`}
                      className="reel-card-link"
                    >
                      Detail
                    </Link>
                    <a href={currentItem.source_url} target="_blank" rel="noopener noreferrer" className="reel-card-link primary">
                      Source
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="empty-state reel-empty-state">
              <h2>No stories yet</h2>
              <p>Refresh the feed data and we'll show the newest briefings here.</p>
            </div>
          )}
        </section>

        <div className="reel-progress">
          {feed.map((item, index) => (
            <button
              key={`${item.headline}-${index}`}
              type="button"
              className={`reel-progress-dot ${index === currentIndex ? "active" : ""}`}
              onClick={() => {
                setAnimationDirection(index > currentIndex ? "next" : "prev");
                setCurrentIndex(index);
                if (cardScrollRef.current) {
                  cardScrollRef.current.scrollTop = 0;
                }
              }}
              aria-label={`Open story ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Feed controls">
        <button
          type="button"
          className={`bottom-nav-item ${category === "All" ? "active" : ""}`}
          onClick={() => {
            setCategory("All");
            setActiveSheet(null);
          }}
        >
          <span className="bottom-nav-label">Home</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSheet === "category" ? "active" : ""}`}
          onClick={() => setActiveSheet((value) => (value === "category" ? null : "category"))}
        >
          <span className="bottom-nav-label">Category</span>
        </button>
        <button
          type="button"
          className={`bottom-nav-item ${activeSheet === "settings" ? "active" : ""}`}
          onClick={() => setActiveSheet((value) => (value === "settings" ? null : "settings"))}
        >
          <span className="bottom-nav-label">Settings</span>
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
                  <small>{item === "All" ? "Balanced mix across the full feed." : `${item} stories first, then the usual feed.`}</small>
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
