export interface NewsItem {
  headline: string;
  body: string;
  full_body?: string;
  image: string;
  source_url: string;
  source_name?: string;
  tags: string[];
  date: string;
}

export type ReadMode = "Normal" | "Kids" | "GenZ" | "Axios";
export type Category = "All" | "Technology" | "Sports" | "Politics" | "Entertainment" | "Business";
export type SupportedLanguage = "en" | "hi" | "mr" | "bn" | "ta" | "te";
