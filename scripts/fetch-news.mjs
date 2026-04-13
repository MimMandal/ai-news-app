// scripts/fetch-news.mjs
// Run by GitHub Actions twice a day.
// Fetches RSS headlines, optionally enriches them with Gemini AI,
// and writes the latest data to both /data and /public/data.

import { GoogleGenerativeAI } from "@google/generative-ai";
import Parser from "rss-parser";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MAX_ARTICLES = 12;
const GEMINI_ARTICLE_LIMIT = 8;
const DELETE_AFTER_DAYS = 6;
const OUTPUT_PATHS = [
  resolve(__dirname, "../data/news.json"),
  resolve(__dirname, "../public/data/news.json"),
];

const RSS_FEEDS = [
  { url: "https://feeds.feedburner.com/ndtvnews-india-news", tags: ["politics"] },
  { url: "https://feeds.feedburner.com/ndtvnews-top-stories", tags: ["politics", "business"] },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", tags: ["business"] },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", tags: ["politics", "business"] },
  { url: "https://www.thehindu.com/sci-tech/technology/feeder/default.rss", tags: ["technology"] },
  { url: "https://www.thehindu.com/news/national/feeder/default.rss", tags: ["politics"] },
  { url: "https://sports.ndtv.com/rss/cricket", tags: ["sports", "cricket"] },
  { url: "https://feeds.feedburner.com/gadgets360-latest", tags: ["technology"] },
  { url: "https://economictimes.indiatimes.com/rss/startup", tags: ["business", "technology"] },
];

function getSourceName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeArticleHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ");
}

function normalizeArticleText(value) {
  return decodeHtml(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBoilerplateText(text) {
  const normalized = text.toLowerCase();

  return (
    normalized.length < 40 ||
    /privacy policy|cookie policy|terms of use|all rights reserved|subscribe|sign in|follow us|read more|advertisement/.test(normalized) ||
    /function\s*\(|createelement\s*\(|appendchild\s*\(|vdo\.ai|googletagmanager|scorecardresearch|doubleclick/.test(normalized) ||
    /mutual fund calculator|download our app|newsletter|first day first show|today'?s cache|science for all|health matters|the hindu on books|view from india|data point/.test(normalized) ||
    /photo credit:|click here|here ';p\+='|pic\.twitter\.com\/|community guidelines|commenting platform|vuukle|registered user|login to post comments|comments have to be in english/.test(normalized) ||
    /^[a-z\s/-]{8,120}$/.test(normalized)
  );
}

function cleanArticleText(value) {
  const text = normalizeArticleText(stripHtml(value));
  return isBoilerplateText(text) ? "" : text;
}

function resolveAbsoluteUrl(value, baseUrl) {
  if (!value) return "";

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function extractMetaContent(html, selectors) {
  for (const selector of selectors) {
    const patterns = [
      new RegExp(`<meta[^>]+${selector}[^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${selector}`, "i"),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const value = match[1];
        if (value?.trim()) {
          return decodeHtml(value.trim());
        }
      }
    }
  }

  return "";
}

function isProbablyUsableImageUrl(value) {
  if (!value) return false;

  const normalized = value.trim().toLowerCase();

  if (!/^https?:\/\//.test(normalized)) return false;
  if (/google-analytics|doubleclick|googletagmanager|analytics\.js|gtm\.js/.test(normalized)) return false;
  if (/\.(?:js|css)(?:[?#].*)?$/.test(normalized)) return false;
  if (/logo|sprite|icon|avatar|placeholder/.test(normalized) && /\.svg(?:[?#].*)?$/.test(normalized)) return false;

  return true;
}

function firstValidImageCandidate(candidates, baseUrl) {
  for (const candidate of candidates) {
    const resolved = resolveAbsoluteUrl(candidate, baseUrl);
    if (isProbablyUsableImageUrl(resolved)) {
      return resolved;
    }
  }

  return "";
}

function extractImageFromHtml(html, baseUrl) {
  const metaImage = extractMetaContent(html, [
    "property=[\"']og:image(?:[:][^\"']+)?[\"']",
    "name=[\"']twitter:image(?:[:][^\"']+)?[\"']",
    "name=[\"']image[\"']",
    "itemprop=[\"']image[\"']",
  ]);

  if (metaImage) {
    const resolved = firstValidImageCandidate([metaImage], baseUrl);
    if (resolved) {
      return resolved;
    }
  }

  const linkMatch =
    html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);

  if (linkMatch?.[1]) {
    const resolved = firstValidImageCandidate([decodeHtml(linkMatch[1].trim())], baseUrl);
    if (resolved) {
      return resolved;
    }
  }

  const jsonLdMatches = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
    (match) => match[1]
  );

  for (const block of jsonLdMatches) {
    try {
      const parsed = JSON.parse(block.trim());
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length) {
        const current = queue.shift();
        if (!current || typeof current !== "object") continue;

        const imageValue = current.image ?? current.thumbnailUrl ?? current.thumbnail;
        if (typeof imageValue === "string" && imageValue.trim()) {
          const resolved = firstValidImageCandidate([decodeHtml(imageValue.trim())], baseUrl);
          if (resolved) {
            return resolved;
          }
        }

        if (Array.isArray(imageValue)) {
          const resolved = firstValidImageCandidate(
            imageValue.filter((entry) => typeof entry === "string").map((entry) => decodeHtml(entry.trim())),
            baseUrl
          );
          if (resolved) {
            return resolved;
          }
        }

        for (const value of Object.values(current)) {
          if (value && typeof value === "object") {
            queue.push(value);
          }
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks and keep scanning.
    }
  }

  const inlineImages = Array.from(
    html.matchAll(/<img\b[^>]+src=["']([^"']+)["'][^>]*>/gi),
    (match) => decodeHtml(match[1].trim())
  );

  return firstValidImageCandidate(inlineImages, baseUrl);
}

async function fetchArticlePage(url) {
  const articleUrl = url.split("#")[0];
  const response = await fetch(articleUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return {
    html: await response.text(),
    finalUrl: response.url || articleUrl,
  };
}

function isWithinRetentionWindow(pubDate) {
  const publishedAt = new Date(pubDate);
  if (Number.isNaN(publishedAt.getTime())) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DELETE_AFTER_DAYS);

  return publishedAt >= cutoff;
}

async function fetchOgImage(url) {
  try {
    const { html, finalUrl } = await fetchArticlePage(url);
    return extractImageFromHtml(html, finalUrl);
  } catch (err) {
    console.warn(`Failed to fetch og:image for ${url}: ${err.message}`);
    return "";
  }
}

function extractFullArticleText(html) {
  const cleanedHtml = sanitizeArticleHtml(html);
  const articleBlockMatch =
    cleanedHtml.match(/<article[\s\S]*?<\/article>/i) ||
    cleanedHtml.match(/<main[\s\S]*?<\/main>/i) ||
    cleanedHtml.match(/<body[\s\S]*?<\/body>/i);

  const block = articleBlockMatch?.[0] || cleanedHtml;
  const paragraphs = Array.from(
    block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),
    (match) => cleanArticleText(match[1] || "")
  )
    .filter((text) => text.length > 60);

  const uniqueParagraphs = [];
  const seen = new Set();

  for (const paragraph of paragraphs) {
    const key = paragraph.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueParagraphs.push(paragraph);
    if (uniqueParagraphs.length >= 8) break;
  }

  return uniqueParagraphs.join("\n\n");
}

async function fetchArticleMetadata(url) {
  try {
    const { html, finalUrl } = await fetchArticlePage(url);
    const image = extractImageFromHtml(html, finalUrl);
    const summary = extractMetaContent(html, [
      "property=[\"']og:description[\"']",
      "name=[\"']description[\"']",
      "name=[\"']twitter:description[\"']",
    ]);

    const fullText = extractFullArticleText(html);

    return {
      image,
      summary: summary ? cleanArticleText(summary) : "",
      fullText,
    };
  } catch (err) {
    console.warn(`Failed to fetch article metadata for ${url}: ${err.message}`);
    return { image: "", summary: "", fullText: "" };
  }
}

async function fetchRSSItems() {
  const parser = new Parser({
    timeout: 10000,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
    },
  });

  const results = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items.slice(0, 3);

      for (const item of items) {
        if (!item.title || !item.link) continue;
        if (!isWithinRetentionWindow(item.pubDate || new Date().toISOString())) continue;

        const cleanedSummary = cleanArticleText(item.contentSnippet?.trim() || item.content?.trim() || "");
        const metadata = await fetchArticleMetadata(item.link.trim());
        const feedImage =
          item.enclosure?.url ||
          item["media:content"]?.$.url ||
          item["media:thumbnail"]?.$.url ||
          "";
        const image = feedImage || metadata.image || (await fetchOgImage(item.link.trim()));
        const summary = cleanedSummary || metadata.summary;

        results.push({
          title: item.title.trim(),
          link: item.link.trim(),
          summary,
          fullText: metadata.fullText || summary,
          tags: feed.tags,
          pubDate: item.pubDate || new Date().toISOString(),
          image,
          sourceName: getSourceName(item.link.trim()),
        });
      }
    } catch (err) {
      console.warn(`Failed to fetch feed ${feed.url}: ${err.message}`);
    }
  }

  const seen = new Set();

  return results.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toFallbackArticle(item) {
  return {
    headline: item.title,
    body: item.summary || "Read the full article for more details.",
    full_body: item.fullText || item.summary || "Read the full article for more details.",
    image: item.image || "",
    source_url: item.link,
    source_name: item.sourceName || getSourceName(item.link),
    tags: item.tags,
    date: new Date(item.pubDate).toISOString(),
  };
}

async function enrichWithGemini(items) {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Using RSS content without AI enrichment.");
    return items.slice(0, MAX_ARTICLES).map(toFallbackArticle);
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const enriched = [];

  for (const [index, item] of items.slice(0, MAX_ARTICLES).entries()) {
    if (index >= GEMINI_ARTICLE_LIMIT) {
      enriched.push(toFallbackArticle(item));
      continue;
    }

    try {
      const prompt = `
You are an AI news writer. Given the following news headline, summary, and article text, write a structured JSON response.

HEADLINE: ${item.title}
SUMMARY: ${item.summary || "No summary available."}
ARTICLE: ${(item.fullText || item.summary || "No article text available.").slice(0, 6000)}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "headline": "Clean, well-written headline (improve the original if needed)",
  "body": "A well-written 3-4 sentence news paragraph covering who, what, when, where, why. Be factual and engaging.",
  "full_body": "A fuller 6-10 sentence article using only the provided material. Keep it factual and detailed.",
  "tags": ["tag1", "tag2"],
  "image_search_query": "A descriptive 4-6 word phrase to search for a representative stock photo"
}

Tags should be 1-2 items from: technology, sports, politics, entertainment, business, science, health, environment, culture, cricket.
`.trim();

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(cleaned);

      enriched.push({
        headline: parsed.headline || item.title,
        body: parsed.body || item.summary,
        full_body: parsed.full_body || item.fullText || item.summary,
        image:
          item.image ||
          `https://source.unsplash.com/800x450/?${encodeURIComponent(parsed.image_search_query || "news")}`,
        source_url: item.link,
        source_name: item.sourceName || getSourceName(item.link),
        tags: parsed.tags || item.tags,
        date: new Date(item.pubDate).toISOString(),
      });

      await new Promise((resolveDelay) => setTimeout(resolveDelay, 1000));
    } catch (err) {
      console.warn(`Skipping article due to Gemini error: ${err.message}`);
      enriched.push(toFallbackArticle(item));
    }
  }

  return enriched;
}

function loadExistingArticles() {
  for (const outputPath of OUTPUT_PATHS) {
    if (existsSync(outputPath)) {
      try {
        const data = JSON.parse(readFileSync(outputPath, "utf-8"));
        if (Array.isArray(data)) {
          console.log(`Loaded ${data.length} existing articles from ${outputPath}`);
          return data;
        }
      } catch {
        // Ignore corrupt files, start fresh.
      }
    }
  }
  return [];
}

function mergeArticles(existing, incoming) {
  const seen = new Set();
  const merged = [];

  // Add incoming first (they take priority)
  for (const item of incoming) {
    const key = item.headline.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  // Add existing articles that aren't duplicates
  for (const item of existing) {
    const key = item.headline.toLowerCase().slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  // Remove articles older than retention window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DELETE_AFTER_DAYS);

  const retained = merged.filter((item) => {
    const date = new Date(item.date);
    return !Number.isNaN(date.getTime()) && date >= cutoff;
  });

  // Sort latest first
  retained.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return retained;
}

(async () => {
  console.log("Loading existing articles...");
  const existing = loadExistingArticles();

  console.log("Fetching RSS feeds...");
  const rssItems = await fetchRSSItems();
  console.log(`Got ${rssItems.length} raw articles`);

  console.log("Preparing article content...");
  const freshNews = await enrichWithGemini(rssItems);
  console.log(`Prepared ${freshNews.length} new articles`);

  const news = mergeArticles(existing, freshNews);
  console.log(`Total after merge: ${news.length} (kept articles from last ${DELETE_AFTER_DAYS} days)`);

  for (const outputPath of OUTPUT_PATHS) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(news, null, 2), "utf-8");
    console.log(`Written to ${outputPath}`);
  }

  console.log(`Total articles: ${news.length}`);
})();
