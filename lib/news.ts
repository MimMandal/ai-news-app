import { NewsItem, ReadMode, SupportedLanguage } from "@/types/news";

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80";

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
};

const MODE_LABELS: Record<SupportedLanguage, Record<ReadMode, string>> = {
  en: {
    Normal: "Classic briefing",
    Kids: "Easy read",
    GenZ: "Internet mode",
    Axios: "Quick points",
  },
  hi: {
    Normal: "Saaf khabar",
    Kids: "Aasaan padhai",
    GenZ: "GenZ andaaz",
    Axios: "Jhatpat points",
  },
  mr: {
    Normal: "Sopi batmi",
    Kids: "Mulansathi sope",
    GenZ: "GenZ style",
    Axios: "Jalad mudde",
  },
  bn: {
    Normal: "Shohoj khobor",
    Kids: "Shohoj kore",
    GenZ: "GenZ bhongi",
    Axios: "Druto points",
  },
  ta: {
    Normal: "Sarala seithi",
    Kids: "Easy read",
    GenZ: "GenZ style",
    Axios: "Quick points",
  },
  te: {
    Normal: "Sadharana vaartha",
    Kids: "Sulabhamga chadavandi",
    GenZ: "GenZ style",
    Axios: "Tvarita points",
  },
};

const SOURCE_LABELS: Record<SupportedLanguage, string> = {
  en: "read more at",
  hi: "poora padhen",
  mr: "pudhe vacha",
  bn: "aro porun",
  ta: "melum vaasikka",
  te: "inka chadavandi",
};

const DETAIL_LABELS: Record<SupportedLanguage, { summary: string; original: string; back: string; source: string }> = {
  en: { summary: "Story", original: "Original coverage", back: "Back to feed", source: "Source" },
  hi: { summary: "Khabar", original: "Mool report", back: "Feed par wapas", source: "Source" },
  mr: { summary: "Batmi", original: "Mool report", back: "Feedkade parat", source: "Source" },
  bn: { summary: "Khobor", original: "Mool protibedon", back: "Feed e phire jan", source: "Source" },
  ta: { summary: "Seithi", original: "Original story", back: "Feed ku thirumbu", source: "Source" },
  te: { summary: "Vaartha", original: "Original story", back: "Feed ki tirugu", source: "Source" },
};

const MODE_DESCRIPTIONS: Record<SupportedLanguage, Record<Exclude<ReadMode, "Normal">, string>> = {
  en: {
    Kids: "Simpler words and softer pacing for younger readers.",
    GenZ: "Rewritten with internet-native energy and playful phrasing.",
    Axios: "Scannable bullets with the main takeaway up top.",
  },
  hi: {
    Kids: "Chhote pathakon ke liye aasan shabd aur halka tone.",
    GenZ: "Internet wale andaaz aur playful language mein likha gaya.",
    Axios: "Mukhya baat upar, neeche chhote points.",
  },
  mr: {
    Kids: "Lahan vachakansathi sope shabd ani halka tone.",
    GenZ: "Internet sarkhi energy ani fun bhashat lihileli version.",
    Axios: "Var mukhya nishkarsh, khali short mudde.",
  },
  bn: {
    Kids: "Chhoto der jonno shohoj bhasha ar norom tone.",
    GenZ: "Internet tone e aro fun kore lekha.",
    Axios: "Upar e main point, niche chhoto bullet.",
  },
  ta: {
    Kids: "Easy words and soft pacing for younger readers.",
    GenZ: "Internet tone oda playful version.",
    Axios: "Main point mela, keela short bullets.",
  },
  te: {
    Kids: "Chinna paathakula kosam simple words mariyu soft tone.",
    GenZ: "Internet tone to playful rewrite.",
    Axios: "Main point paina, kinda short bullets.",
  },
};

type RenderedBody =
  | { kind: "paragraph"; badge?: string; text: string }
  | { kind: "bullets"; badge?: string; intro?: string; items: string[] };

function simplifyForKids(body: string) {
  return (
    body
      .replace(/\b(\d+(?:,\d+)*)\s*(?:crore|billion|million|lakh)\b/gi, "a big number")
      .replace(/\b(?:infrastructure|legislation)\b/gi, "important plans")
      .replace(/\b(?:approximately|estimated)\b/gi, "about")
      .split(/(?<=[.?!])\s+/)
      .slice(0, 3)
      .join(" ")
      .trim() || body
  );
}

function stylizeForGenZ(headline: string, body: string) {
  const intros = [
    "Lowkey, here's the whole scene:",
    "Real talk, this one matters:",
    "POV: the headline is actually a big deal:",
    "Internet version of the update:",
  ];

  const transformedHeadline = `${["lowkey", "fr", "real talk", "big update"][headline.length % 4]}: ${headline}`;
  const transformedBody = body
    .replace(/\bimportant\b/gi, "actually huge")
    .replace(/\bsignificant\b/gi, "major")
    .replace(/\bwill\b/gi, "is going to")
    .replace(/\bconfirmed\b/gi, "officially confirmed")
    .replace(/\bannounced\b/gi, "dropped")
    .split(/(?<=[.?!])\s+/)
    .slice(0, 4)
    .join(" ")
    .trim();

  return {
    headline: transformedHeadline,
    body: `${intros[body.length % intros.length]} ${transformedBody}`.trim(),
  };
}

function axiosBullets(body: string) {
  return body
    .split(/(?<=[.;?!])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18)
    .slice(0, 5);
}

export function formatNewsDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getArticleSlug(item: NewsItem) {
  return `${item.headline}-${item.source_url}`
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "original source";
  }
}

export function getModeDescription(mode: ReadMode, language: SupportedLanguage) {
  if (mode === "Normal") return "";
  return MODE_DESCRIPTIONS[language][mode];
}

export function getModeLabel(mode: ReadMode, language: SupportedLanguage) {
  return MODE_LABELS[language][mode];
}

export function getDetailLabels(language: SupportedLanguage) {
  return DETAIL_LABELS[language];
}

export function getSourceLabel(language: SupportedLanguage) {
  return SOURCE_LABELS[language];
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderHeadline(headline: string, mode: ReadMode) {
  const normalizedHeadline = decodeHtmlEntities(headline);
  if (mode !== "GenZ") return normalizedHeadline;
  return stylizeForGenZ(normalizedHeadline, "").headline;
}

export function renderBody(item: NewsItem, mode: ReadMode, language: SupportedLanguage): RenderedBody {
  const badge = `${getModeLabel(mode, language)} . ${LANGUAGE_LABELS[language]}`;
  const normalizedItem = {
    ...item,
    headline: decodeHtmlEntities(item.headline),
    body: decodeHtmlEntities(item.body),
  };

  if (mode === "Kids") {
    return {
      kind: "paragraph",
      badge,
      text: simplifyForKids(normalizedItem.body),
    };
  }

  if (mode === "GenZ") {
    return {
      kind: "paragraph",
      badge,
      text: stylizeForGenZ(normalizedItem.headline, normalizedItem.body).body,
    };
  }

  if (mode === "Axios") {
    return {
      kind: "bullets",
      badge,
      intro: language === "en" ? "Why it matters" : getModeLabel(mode, language),
      items: axiosBullets(normalizedItem.body),
    };
  }

  return {
    kind: "paragraph",
    badge,
    text: normalizedItem.body,
  };
}
