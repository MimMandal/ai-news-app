export interface NewsItem {
  headline: string;
  body: string;
  image: string;
  source_url: string;
  tags: string[];
  date: string;
}

export type ReadMode = "Normal" | "Kids" | "GenZ" | "Axios";
export type Category = "All" | "Technology" | "Sports" | "Politics" | "Entertainment" | "Business";
