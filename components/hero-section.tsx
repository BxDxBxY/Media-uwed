import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar } from "lucide-react";

import { featuredArticle, articles } from "@/lib/mock-data";

export function HeroSection() {
  const secondaryArticles = articles.slice(1, 4);

  return (
    <section className="py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Featured Article */}
        <div className="lg:col-span-2 group relative overflow-hidden rounded-xl border border-border/40 bg-card">
          <div className="aspect-video relative overflow-hidden">
             {/* Using a placeholder div if Image fails or for better control in mock */}
             <div className="absolute inset-0 bg-muted" />
             <img 
               src={featuredArticle.image} 
               alt={featuredArticle.title}
               className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
             />
          </div>
          <div className="p-6 md:p-8 relative">
             <div className="flex items-center gap-2 mb-3">
                <span className="badge px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                  {featuredArticle.category}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {featuredArticle.date}
                </span>
             </div>
             <h2 className="text-2xl md:text-3xl font-serif font-bold mb-3 tracking-tight group-hover:text-primary transition-colors">
               <Link href={`/article/${featuredArticle.slug}`}>
                 {featuredArticle.title}
               </Link>
             </h2>
             <p className="text-muted-foreground mb-4 line-clamp-2">
               {featuredArticle.summary}
             </p>
             <Link href={`/article/${featuredArticle.slug}`} className="inline-flex items-center text-sm font-medium text-primary hover:underline">
               Read Full Story <ArrowRight className="ml-1 h-4 w-4" />
             </Link>
          </div>
        </div>

        {/* Secondary Articles List */}
        <div className="flex flex-col gap-6 h-full">
          <div className="flex items-center justify-between pb-2 border-b border-border">
             <h3 className="font-serif text-xl font-bold">Trending Now</h3>
          </div>
          <div className="flex flex-col gap-6 flex-1">
            {secondaryArticles.map((article) => (
              <div key={article.id} className="group flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                   <span className="text-primary font-medium">{article.category}</span>
                   <span>•</span>
                   <span>{article.date}</span>
                </div>
                <h4 className="font-medium text-lg leading-snug group-hover:text-primary transition-colors">
                  <Link href={`/article/${article.slug}`}>
                    {article.title}
                  </Link>
                </h4>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-4 border-t border-border/40">
            <Link href="/news" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-between w-full">
              View All News <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
