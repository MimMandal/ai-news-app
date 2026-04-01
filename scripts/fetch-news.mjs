// scripts/fetch-news.mjs
// Run by GitHub Actions twice a day.
// Fetches RSS headlines, optionally enriches them with Gemini AI,
// and writes the latest data to both /data and /public/data.

import { GoogleGenerativeAI } from "@google/generative-ai";
import Parser from "rss-parser";
import { mkdirSync, writeFileSync } from "fs";
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

function isWithinRetentionWindow(pubDate) {
  const publishedAt = new Date(pubDate);
  if (Number.isNaN(publishedAt.getTime())) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DELETE_AFTER_DAYS);

  return publishedAt >= cutoff;
}

async function fetchOgImage(url) {
  try {
    const articleUrl = url.split("#")[0];
    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      },
    });

    if (!response.ok) return "";

    const html = await response.text();
    const imageMatch =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);

    return imageMatch?.[1] ? decodeHtml(imageMatch[1].trim()) : "";
  } catch (err) {
    console.warn(`Failed to fetch og:image for ${url}: ${err.message}`);
    return "";
  }
}

function extractFullArticleText(html) {
  const articleBlockMatch =
    html.match(/<article[\s\S]*?<\/article>/i) ||
    html.match(/<main[\s\S]*?<\/main>/i) ||
    html.match(/<body[\s\S]*?<\/body>/i);

  const block = articleBlockMatch?.[0] || html;
  const paragraphs = Array.from(
    block.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi),
    (match) => stripHtml(match[1] || "")
  )
    .map((text) => text.trim())
    .filter((text) => text.length > 60)
    .filter(
      (text) =>
        !/subscribe|sign in|follow us|read more|advertisement|all rights reserved|cookie/i.test(text)
    );

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
    const articleUrl = url.split("#")[0];
    const response = await fetch(articleUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      },
    });

    if (!response.ok) {
      return { image: "", summary: "", fullText: "" };
    }

    const html = await response.text();
    const imageMatch =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i);
    const summaryMatch =
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i) ||
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:description["']/i);

    const fullText = extractFullArticleText(html);

    return {
      image: imageMatch?.[1] ? decodeHtml(imageMatch[1].trim()) : "",
      summary: summaryMatch?.[1] ? stripHtml(summaryMatch[1].trim()) : "",
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

        const cleanedSummary = stripHtml(item.contentSnippet?.trim() || item.content?.trim() || "");
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

(async () => {
  console.log("Fetching RSS feeds...");
  const rssItems = await fetchRSSItems();
  console.log(`Got ${rssItems.length} raw articles`);

  console.log("Preparing article content...");
  const news = await enrichWithGemini(rssItems);
  console.log(`Prepared ${news.length} articles`);

  news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  for (const outputPath of OUTPUT_PATHS) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, JSON.stringify(news, null, 2), "utf-8");
    console.log(`Written to ${outputPath}`);
  }

  console.log(`Total articles: ${news.length}`);
})();
