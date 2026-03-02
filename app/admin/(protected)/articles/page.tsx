"use client";

import Link from "next/link";
import { PlusCircle, Search, FileEdit, Trash2 } from "lucide-react";
import { useGlobalContext } from "@/lib/context";
import { useState } from "react";

export default function AdminArticlesPage() {
   const { articles, deleteArticle } = useGlobalContext();
   const [searchTerm, setSearchTerm] = useState("");

   const filteredArticles = articles.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.author.toLowerCase().includes(searchTerm.toLowerCase())
   );

   return (
      <div className="space-y-6">
         <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-serif">Articles</h1>
            <Link href="/admin/articles/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
               <PlusCircle className="h-4 w-4" />
               New Article
            </Link>
         </div>

         <div className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <input
                  type="text"
                  placeholder="Search articles..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
         </div>

         <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
               <thead className="bg-muted/50 border-b border-border/40">
                  <tr>
                     <th className="px-6 py-3 font-medium text-muted-foreground">Title</th>
                     <th className="px-6 py-3 font-medium text-muted-foreground">Category</th>
                     <th className="px-6 py-3 font-medium text-muted-foreground">Author</th>
                     <th className="px-6 py-3 font-medium text-muted-foreground">Date</th>
                     <th className="px-6 py-3 font-medium text-muted-foreground">Status</th>
                     <th className="px-6 py-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/40">
                  {filteredArticles.map((article) => (
                     <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 font-medium max-w-sm truncate">{article.title}</td>
                        <td className="px-6 py-4">{article.category}</td>
                        <td className="px-6 py-4">{article.author}</td>
                        <td className="px-6 py-4">{article.date}</td>
                        <td className="px-6 py-4">
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                              Published
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/articles/new?edit=${article.id}`} className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground">
                                 <FileEdit className="h-4 w-4" />
                              </Link>
                              <button
                                 onClick={() => deleteArticle(article.id)}
                                 className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-destructive"
                              >
                                 <Trash2 className="h-4 w-4" />
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {/* Mock Draft Row - removed to rely on real state */}
               </tbody>
            </table>
            {filteredArticles.length === 0 && (
               <div className="p-8 text-center text-muted-foreground">
                  No articles found.
               </div>
            )}
         </div>
      </div>
   );
}
