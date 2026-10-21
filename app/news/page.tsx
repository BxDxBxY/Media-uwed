import { Suspense } from "react";
import NewsClientPage from "./news-client";
import { buildPageMetadata } from "@/lib/page-metadata";

export const metadata = buildPageMetadata({
  title: "News",
  description:
    "The full news archive: university news, Uzbekistan's diplomacy and economy, and Central Asian affairs — searchable and filterable by category and date.",
  path: "/news",
});

function NewsPageFallback() {
  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground font-serif italic">Loading news archive...</p>
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense fallback={<NewsPageFallback />}>
      <NewsClientPage />
    </Suspense>
  );
}
