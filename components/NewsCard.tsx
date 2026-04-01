"use client";

import Link from "next/link";
import { useState } from "react";
import ArticleBody from "@/components/ArticleBody";
import {
  FALLBACK_IMAGE,
  formatNewsDate,
  getArticleSlug,
  getHostname,
  getSourceLabel,
  renderHeadline,
} from "@/lib/news";
import { NewsItem, ReadMode, SupportedLanguage } from "@/types/news";

interface NewsCardProps {
  item: NewsItem;
  mode: ReadMode;
  language: SupportedLanguage;
  feedQuery: string;
}

export default function NewsCard({ item, mode, language, feedQuery }: NewsCardProps) {
  const [imgError, setImgError] = useState(false);
  const articleHref = `/article/${getArticleSlug(item)}${feedQuery ? `?${feedQuery}` : ""}`;

  return (
    <article className="news-card news-card-inline">
      <Link href={articleHref} className="news-card-link" aria-label={item.headline}>
        <div className="news-card-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgError ? FALLBACK_IMAGE : item.image || FALLBACK_IMAGE}
            alt={item.headline}
            loading="lazy"
            onError={() => setImgError(true)}
            className="card-img news-card-image"
          />
        </div>

        <div className="news-card-content">
          <div className="news-card-meta">
            <span className="meta-accent">short by AI News</span>
            <span>{formatNewsDate(item.date)}</span>
          </div>

          <h2 className="news-card-title inshorts-title">{renderHeadline(item.headline, mode)}</h2>

          <div className="news-card-body">
            <ArticleBody item={item} mode={mode} language={language} clamp />
          </div>

          <div className="news-card-footer">
            <span className="source-text">
              {getSourceLabel(language)} <strong>{getHostname(item.source_url)}</strong>
            </span>
            <div className="tag-row">
              {item.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="tag-badge">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
