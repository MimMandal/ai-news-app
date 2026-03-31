# 📰 AI News — Next.js App

A production-ready AI-powered news web app built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**. News is auto-fetched from RSS feeds, enriched by **Gemini AI**, and committed to the repo every 6 hours via **GitHub Actions**.

---

## 🚀 Quick Start

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
/app
  page.tsx          ← Main page with all state
  layout.tsx        ← Root layout + theme provider
  globals.css       ← CSS variables + global styles

/components
  Navbar.tsx        ← Sticky navbar (hide/show on scroll)
  NewsCard.tsx      ← Card with 4 read modes
  ModeSwitcher.tsx  ← Normal / Kids / GenZ / Axios
  CategoryFilter.tsx← All / Tech / Sports / Politics / Entertainment / Business
  SkeletonCard.tsx  ← Loading skeleton
  ThemeProvider.tsx ← next-themes wrapper

/data
  news.json         ← Auto-updated by GitHub Actions cron job

/types
  news.ts           ← TypeScript interfaces

/scripts
  fetch-news.mjs    ← Gemini + RSS fetcher script

/.github/workflows
  fetch-news.yml    ← Cron job (every 6 hours)
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Read Modes** | Normal, Kids (simplified), GenZ (casual+emoji), Axios (5 bullet points) |
| **Categories** | All, Technology, Sports, Politics, Entertainment, Business |
| **Search** | Instant, case-insensitive headline filtering |
| **Dark Mode** | next-themes, persisted, system default |
| **Navbar** | Hides on scroll down, reappears on scroll up |
| **Pagination** | Load More (6 cards at a time) |
| **Skeletons** | Shown while data loads |
| **Responsive** | 1 col (mobile) → 2 col (tablet) → 3 col (desktop) |

---

## 🤖 Gemini Cron Job Setup

### 1. Add your Gemini API key as a GitHub Secret

Go to your repo → **Settings → Secrets → Actions → New repository secret**

```
Name: GEMINI_API_KEY
Value: your-gemini-api-key-here
```

Get a free key at: https://aistudio.google.com/app/apikey

### 2. That's it!

GitHub Actions will automatically:
- Run every 6 hours
- Pull from RSS feeds (NDTV, Times of India, The Hindu, etc.)
- Enrich each article with Gemini (`gemini-1.5-flash`)
- Commit the updated `data/news.json` back to your repo
- Trigger a Vercel/Netlify redeploy (if connected)

### Manual trigger

You can also trigger it manually from **Actions tab → Fetch AI News with Gemini → Run workflow**.

---

## 🎨 Design

- **Typography**: Playfair Display (serif headlines) + DM Sans (body)
- **Color**: Warm off-whites, charcoal text, crimson accent (`#c8102e`)
- **Inspired by**: Axios.com editorial layout
- **Dark mode**: Full CSS variable theming

---

## 🛠 Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- next-themes
- Google Gemini AI (`gemini-1.5-flash`)
- GitHub Actions (cron)
- RSS Parser

---

## 📝 Customizing RSS Feeds

Edit `scripts/fetch-news.mjs` to add/remove RSS sources:

```js
const RSS_FEEDS = [
  { url: "your-rss-url", tags: ["technology"] },
  // ...
];
```

---

## 🚢 Deploy

### Vercel (recommended)
```bash
npx vercel --prod
```

The app is fully static-friendly. `data/news.json` is read at request time (ISR can be added).
