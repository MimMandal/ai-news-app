"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ArticleBody from "@/components/ArticleBody";
import ReadingControls from "@/components/ReadingControls";
import {
  FALLBACK_IMAGE,
  formatNewsDate,
  getArticleSlug,
  getDetailLabels,
  getHostname,
  renderHeadline,
} from "@/lib/news";
import { NewsItem, ReadMode, SupportedLanguage } from "@/types/news";

function parseMode(value: string | null): ReadMode {
  return value === "Kids" || value === "GenZ" || value === "Axios" ? value : "Normal";
}

function parseLanguage(value: string | null): SupportedLanguage {
  return value === "hi" || value === "mr" || value === "bn" || value === "ta" || value === "te" ? value : "en";
}

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [article, setArticle] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const mode = parseMode(searchParams.get("mode"));
  const language = parseLanguage(searchParams.get("lang"));
  const labels = getDetailLabels(language);
  const currentQuery = searchParams.toString();

  const backQuery = useMemo(() => {
    return currentQuery ? `/?${currentQuery}` : "/";
  }, [currentQuery]);

  function updateReadingPreference(key: "mode" | "lang", value: string, defaultValue: string) {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (value === defaultValue) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    const nextQuery = nextParams.toString();
    router.replace(`/article/${params.slug}${nextQuery ? `?${nextQuery}` : ""}`);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadArticle() {
      const res = await fetch("/data/news.json");
      const data: NewsItem[] = await res.json();
      const match = data.find((item) => getArticleSlug(item) === params.slug);

      if (!cancelled) {
        setArticle(match ?? null);
        setLoading(false);
      }
    }

    void loadArticle();

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <main className="article-shell">
        <div className="article-page-frame article-loading">Loading article...</div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="article-shell">
        <div className="article-page-frame article-empty">
          <h1>Story not found</h1>
          <Link href={backQuery} className="article-back-link">
            {labels.back}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="article-shell">
      <div className="article-page-frame">
        <Link href={backQuery} className="article-back-link">
          {labels.back}
        </Link>

        <article className="article-detail-card">
          <div className="article-hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgError ? FALLBACK_IMAGE : article.image || FALLBACK_IMAGE}
              alt={article.headline}
              className="article-hero-image"
              onError={() => setImgError(true)}
            />
          </div>

          <div className="article-detail-content">
            <div className="article-detail-meta">
              <span className="meta-accent">short by AI News</span>
              <span>{formatNewsDate(article.date)}</span>
            </div>

            <h1 className="article-detail-title">{renderHeadline(article.headline, mode)}</h1>

            <ReadingControls
              mode={mode}
              language={language}
              onModeChange={(nextMode) => updateReadingPreference("mode", nextMode, "Normal")}
              onLanguageChange={(nextLanguage) => updateReadingPreference("lang", nextLanguage, "en")}
            />

            <div className="article-detail-summary">
              <div className="article-section-label">{labels.summary}</div>
              <ArticleBody item={article} mode={mode} language={language} useFullBody />
            </div>

            <div className="article-source-box">
              <div>
                <div className="article-section-label">{labels.original}</div>
                <p className="article-source-copy">
                  This page shows the longest article text available from the current fetch. For the publisher's
                  original full page, open the source below.
                </p>
              </div>
              <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="read-more">
                {labels.source}: {getHostname(article.source_url)}
              </a>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
