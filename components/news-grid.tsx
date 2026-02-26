import Link from "next/link";
import { Calendar, User } from "lucide-react";

import { articles } from "@/lib/mock-data";

export function NewsGrid() {
  const displayArticles = articles.slice(4);

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-serif font-bold">Latest News</h2>
        <Link href="/news" className="text-sm font-medium text-primary hover:underline">
          See All
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {displayArticles.map((article) => (
          <article key={article.id} className="group flex flex-col h-full bg-card rounded-lg border border-border/40 overflow-hidden hover:shadow-sm transition-shadow">
            <div className="p-6 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                 <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                   {article.category}
                 </span>
                 <span className="flex items-center gap-1">
                   <Calendar className="h-3 w-3" /> {article.date}
                 </span>
              </div>
              
              <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">
                <Link href={`/article/${article.slug}`}>
                  {article.title}
                </Link>
              </h3>
              
              <p className="text-muted-foreground mb-4 flex-1 line-clamp-3">
                {article.summary}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" /> {article.author}
                </span>
                <Link href={`/article/${article.slug}`} className="font-medium text-primary hover:underline">
                  Read More
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
