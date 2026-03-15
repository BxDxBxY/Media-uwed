import { Suspense } from "react";
import NewsClientPage from "./news-client";

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
