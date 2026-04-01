import { renderBody } from "@/lib/news";
import { NewsItem, ReadMode, SupportedLanguage } from "@/types/news";

interface ArticleBodyProps {
  item: NewsItem;
  mode: ReadMode;
  language: SupportedLanguage;
  clamp?: boolean;
  useFullBody?: boolean;
}

export default function ArticleBody({
  item,
  mode,
  language,
  clamp = false,
  useFullBody = false,
}: ArticleBodyProps) {
  const content = renderBody(
    useFullBody && item.full_body ? { ...item, body: item.full_body } : item,
    mode,
    language
  );

  if (content.kind === "bullets") {
    return (
      <div className={clamp ? "body-clamp" : undefined}>
        {content.badge ? <div className="mode-badge">{content.badge}</div> : null}
        {content.intro ? <div className="article-kicker">{content.intro}</div> : null}
        <ul className="axios-list">
          {content.items.map((sentence, index) => (
            <li key={`${sentence}-${index}`}>{sentence}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={clamp ? "body-clamp" : undefined}>
      {content.badge ? <div className="mode-badge">{content.badge}</div> : null}
      <p className="article-copy">{content.text}</p>
    </div>
  );
}
