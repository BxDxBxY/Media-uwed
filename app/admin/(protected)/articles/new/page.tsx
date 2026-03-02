"use client";

import { useGlobalContext } from "@/lib/context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Save, Loader2, Globe, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function ArticleFormContent() {
   const { articles, addArticle, updateArticle } = useGlobalContext();
   const router = useRouter();
   const searchParams = useSearchParams();
   const id = searchParams.get("edit") || searchParams.get("id");

   const [isLoading, setIsLoading] = useState(false);
   const [activeTab, setActiveTab] = useState<"en" | "ru" | "uz">("en");

   const [formData, setFormData] = useState({
      title: "",
      titleRu: "",
      titleUz: "",
      summary: "",
      summaryRu: "",
      summaryUz: "",
      content: "",
      contentRu: "",
      contentUz: "",
      image: "",
      imageCaption: "",
      imageCaptionRu: "",
      imageCaptionUz: "",
      category: "Campus Life",
      author: "Admin",
      slug: "",
   });

   useEffect(() => {
      if (id) {
         const article = articles.find((a) => a.id === id);
         if (article) {
            setFormData({
               title: article.title,
               titleRu: article.titleRu || "",
               titleUz: article.titleUz || "",
               summary: article.summary,
               summaryRu: article.summaryRu || "",
               summaryUz: article.summaryUz || "",
               content: article.content,
               contentRu: article.contentRu || "",
               contentUz: article.contentUz || "",
               image: article.image,
               imageCaption: article.imageCaption || "",
               imageCaptionRu: article.imageCaptionRu || "",
               imageCaptionUz: article.imageCaptionUz || "",
               category: article.category,
               author: article.author,
               slug: article.slug,
            });
         }
      }
   }, [id, articles]);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.title) return toast.error("Title is required");
      setIsLoading(true);
      try {
         const payload = {
            ...formData,
            image: formData.image || `https://picsum.photos/seed/${formData.title}/800/600`,
         };
         if (id) {
            await updateArticle(id, payload);
            toast.success("Article updated successfully");
         } else {
            await addArticle(payload);
            toast.success("Article created successfully");
         }
         router.push("/admin/articles");
      } catch (error) {
         toast.error("An error occurred");
      } finally {
         setIsLoading(false);
      }
   };

   const tabs: { id: "en" | "ru" | "uz"; label: string }[] = [
      { id: "en", label: "English" },
      { id: "ru", label: "Russian" },
      { id: "uz", label: "Uzbek" },
   ];

   return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
               <Link
                  href="/admin/articles"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
               >
                  <ArrowLeft className="h-5 w-5" />
               </Link>
               <h1 className="text-2xl font-bold font-serif">
                  {id ? "Edit Article" : "New Article"}
               </h1>
            </div>
            <button
               onClick={handleSubmit}
               disabled={isLoading}
               className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
               {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
               ) : (
                  <Save className="h-4 w-4" />
               )}
               {id ? "Update" : "Publish"}
            </button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <div className="flex border-b border-border/40">
                  {tabs.map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                           }`}
                     >
                        <Globe className="inline-block h-3.5 w-3.5 mr-1.5" />
                        {tab.label}
                     </button>
                  ))}
               </div>

               <div className="p-6 rounded-xl border border-border/40 bg-card space-y-6">
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Title ({activeTab.toUpperCase()})</label>
                     <input
                        type="text"
                        className="w-full px-4 py-3 rounded-md border border-input bg-background font-medium text-lg"
                        placeholder="Enter title..."
                        value={activeTab === "en" ? formData.title : activeTab === "ru" ? formData.titleRu : formData.titleUz}
                        onChange={(e) => {
                           if (activeTab === "en") {
                              setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, "-") });
                           } else if (activeTab === "ru") {
                              setFormData({ ...formData, titleRu: e.target.value });
                           } else {
                              setFormData({ ...formData, titleUz: e.target.value });
                           }
                        }}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Summary ({activeTab.toUpperCase()})</label>
                     <textarea
                        className="w-full px-4 py-2 rounded-md border border-input bg-background min-h-[100px] resize-none"
                        placeholder="Brief summary..."
                        value={activeTab === "en" ? formData.summary : activeTab === "ru" ? formData.summaryRu : formData.summaryUz}
                        onChange={(e) => {
                           const key = activeTab === "en" ? "summary" : activeTab === "ru" ? "summaryRu" : "summaryUz";
                           setFormData({ ...formData, [key]: e.target.value });
                        }}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-sm font-medium">Content ({activeTab.toUpperCase()})</label>
                     <textarea
                        className="w-full px-4 py-2 rounded-md border border-input bg-background min-h-[400px]"
                        placeholder="Write your story..."
                        value={activeTab === "en" ? formData.content : activeTab === "ru" ? formData.contentRu : formData.contentUz}
                        onChange={(e) => {
                           const key = activeTab === "en" ? "content" : activeTab === "ru" ? "contentRu" : "contentUz";
                           setFormData({ ...formData, [key]: e.target.value });
                        }}
                     />
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-sm">
                  <h3 className="font-bold flex items-center gap-2 text-sm">
                     <ImageIcon className="h-4 w-4 text-primary" /> Media & Metadata
                  </h3>
                  <div className="space-y-2">
                     <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image URL</label>
                     <input
                        type="text"
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caption ({activeTab.toUpperCase()})</label>
                     <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                        placeholder="Image description..."
                        value={activeTab === "en" ? formData.imageCaption : activeTab === "ru" ? formData.imageCaptionRu : formData.imageCaptionUz}
                        onChange={(e) => {
                           const key = activeTab === "en" ? "imageCaption" : activeTab === "ru" ? "imageCaptionRu" : "imageCaptionUz";
                           setFormData({ ...formData, [key]: e.target.value });
                        }}
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
                     <select
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                     >
                        <option>Campus Life</option>
                        <option>Academics</option>
                        <option>Research</option>
                        <option>Sports</option>
                        <option>Arts & Culture</option>
                        <option>News</option>
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author</label>
                     <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                     />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                     <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL Slug</label>
                     <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-input bg-muted/50 text-xs"
                        value={formData.slug}
                        readOnly
                     />
                  </div>
               </div>

               <div className="p-4 rounded-xl border border-border/40 bg-card space-y-4">
                  <h3 className="font-semibold text-sm">Preview</h3>
                  <div className="aspect-video rounded-md bg-muted overflow-hidden relative border border-border/40">
                     {formData.image ? (
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                        <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                           <ImageIcon className="h-8 w-8" />
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}

export default function NewArticlePage() {
   return (
      <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /><p className="mt-4 text-muted-foreground">Loading form...</p></div>}>
         <ArticleFormContent />
      </Suspense>
   );
}
