"use client";

import { Category } from "@/types/news";

const CATEGORIES: Category[] = [
  "All",
  "Technology",
  "Sports",
  "Politics",
  "Entertainment",
  "Business",
];

interface CategoryFilterProps {
  selected: Category;
  onChange: (cat: Category) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "2px",
        scrollbarWidth: "none",
      }}
    >
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={`cat-btn ${selected === cat ? "active" : ""}`}
          onClick={() => onChange(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
