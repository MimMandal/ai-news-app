// scripts/fetch-news.mjs
// Run by GitHub Actions every 6 hours.
// Fetches RSS headlines, enriches with Gemini AI, writes to /data/news.json

import { GoogleGenerativeAI } from "@google/generative-ai";
import Parser from "rss-parser";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ──────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY env var is not set.");

const MAX_ARTICLES = 12; // how many articles to keep
const OUTPUT_PATH = resolve(__dirname, "../data/news.json");

// RSS feeds to pull headlines from (India-focused)
const RSS_FEEDS = [
  { url: "https://feeds.feedburner.com/ndtvnews-india-news", tags: ["politics"] },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", tags: ["business"] },
  { url: "https://www.thehindu.com/sci-tech/technology/feeder/default.rss", tags: ["technology"] },
  { url: "https://sports.ndtv.com/rss/cricket", tags: ["sports", "cricket"] },
  { url: "https://feeds.feedburner.com/gadgets360-latest", tags: ["technology"] },
  { url: "https://economictimes.indiatimes.com/rss/startup", tags: ["business", "technology"] },
];

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
async function fetchRSSItems() {
  const parser = new Parser({
    timeout: 10000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; NewsBot/1.0)",
    },
  });

  const results = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items.slice(0, 3); // top 3 per feed
      for (const item of items) {
        if (item.title && item.link) {
          results.push({
            title: item.title.trim(),
            link: item.link.trim(),
            summary: item.contentSnippet?.trim() || item.content?.trim() || "",
            tags: feed.tags,
            pubDate: item.pubDate || new Date().toISOString(),
            // Try to get image from enclosure or media
            image:
              item.enclosure?.url ||
              item["media:content"]?.$.url ||
              item["media:thumbnail"]?.$.url ||
              "",
          });
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch feed ${feed.url}: ${err.message}`);
    }
  }

  // Deduplicate by title
  const seen = new Set();
  return results.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function enrichWithGemini(items) {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const enriched = [];

  for (const item of items.slice(0, MAX_ARTICLES)) {
    try {
      const prompt = `
You are an AI news writer. Given the following news headline and summary, write a structured JSON response.

HEADLINE: ${item.title}
SUMMARY: ${item.summary || "No summary available."}

Return ONLY valid JSON (no markdown, no backticks) with this exact structure:
{
  "headline": "Clean, well-written headline (improve the original if needed)",
  "body": "A well-written 3-4 sentence news paragraph covering who, what, when, where, why. Be factual and engaging.",
  "tags": ["tag1", "tag2"],
  "image_search_query": "A descriptive 4-6 word phrase to search for a representative stock photo"
}

Tags should be 1-2 items from: technology, sports, politics, entertainment, business, science, health, environment, culture, cricket.
`.trim();

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip possible markdown fences
      const cleaned = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      const parsed = JSON.parse(cleaned);

      enriched.push({
        headline: parsed.headline || item.title,
        body: parsed.body || item.summary,
        image: item.image || `https://source.unsplash.com/800x450/?${encodeURIComponent(parsed.image_search_query || "news")}`,
        source_url: item.link,
        tags: parsed.tags || item.tags,
        date: new Date(item.pubDate).toISOString(),
      });

      // Rate limit: wait 1s between Gemini calls to avoid quota exhaustion
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.warn(`Skipping article due to Gemini error: ${err.message}`);
      // Fallback: include article without AI enrichment
      enriched.push({
        headline: item.title,
        body: item.summary || "Read the full article for more details.",
        image: item.image || "",
        source_url: item.link,
        tags: item.tags,
        date: new Date(item.pubDate).toISOString(),
      });
    }
  }

  return enriched;
}

// ──────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────
(async () => {
  console.log("🔍 Fetching RSS feeds...");
  const rssItems = await fetchRSSItems();
  console.log(`✅ Got ${rssItems.length} raw articles`);

  console.log("🤖 Enriching with Gemini AI...");
  const news = await enrichWithGemini(rssItems);
  console.log(`✅ Enriched ${news.length} articles`);

  // Sort by date descending
  news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  writeFileSync(OUTPUT_PATH, JSON.stringify(news, null, 2), "utf-8");
  console.log(`✅ Written to ${OUTPUT_PATH}`);
  console.log(`📰 Total articles: ${news.length}`);
})();
