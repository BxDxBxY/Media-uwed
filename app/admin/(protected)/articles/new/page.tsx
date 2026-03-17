"use client";

import { useGlobalContext } from "@/lib/context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { ArrowLeft, Save, Loader2, Globe, Image as ImageIcon, Plus, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const GALLERY_MARKER = /<!--gallery:([^>]+)-->/i;

function extractGallery(content: string): { cleanContent: string; images: string[] } {
  const match = content.match(GALLERY_MARKER);
  if (!match) return { cleanContent: content, images: [] };
  const images = match[1].split("|").map((x) => x.trim()).filter(Boolean);
  return { cleanContent: content.replace(GALLERY_MARKER, "").trim(), images };
}

function withGallery(content: string, gallery: string[]) {
  const cleaned = content.replace(GALLERY_MARKER, "").trim();
  const normalized = gallery.map((x) => x.trim()).filter(Boolean);
  if (normalized.length === 0) return cleaned;
  return `${cleaned}\n\n<!--gallery:${normalized.join("|")}-->`;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

function ArticleFormContent() {
  const { articles, addArticle, updateArticle } = useGlobalContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("edit") || searchParams.get("id");

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"en" | "ru" | "uz">("en");
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

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
    categories: ["Campus Life"] as string[],
    author: "Admin",
    slug: "",
    gallery: [""] as string[],
  });

  useEffect(() => {
    fetch("/api/frontend/categories").then((r) => r.json()).then((data) => {
      const names = (data?.categories || []).map((c: { name: string }) => c.name).filter(Boolean);
      if (names.length) setAllCategories(names);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    const article = articles.find((a) => a.id === id);
    if (!article) return;
    const parsed = extractGallery(article.content || "");
    const categories = Array.from(new Set([...(article.categories || []).map((c) => c.name), article.category].filter(Boolean)));
    setFormData({
      title: article.title,
      titleRu: article.titleRu || "",
      titleUz: article.titleUz || "",
      summary: article.summary,
      summaryRu: article.summaryRu || "",
      summaryUz: article.summaryUz || "",
      content: parsed.cleanContent,
      contentRu: article.contentRu || "",
      contentUz: article.contentUz || "",
      image: article.image,
      imageCaption: article.imageCaption || "",
      imageCaptionRu: article.imageCaptionRu || "",
      imageCaptionUz: article.imageCaptionUz || "",
      categories: categories.length ? categories : ["News"],
      author: article.author,
      slug: article.slug,
      gallery: parsed.images.length ? parsed.images : [article.image || ""],
    });
  }, [id, articles]);

  useEffect(() => {
    if (!id) {
      setFormData((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
  }, [formData.title, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error("Title is required");
    if (formData.categories.length === 0) return toast.error("Pick at least 1 category");
    setIsLoading(true);
    try {
      const normalizedGallery = formData.gallery.map((x) => x.trim()).filter(Boolean);
      const primaryImage = formData.image || normalizedGallery[0] || `https://picsum.photos/seed/${formData.title}/800/600`;
      const payload = {
        title: formData.title,
        titleRu: formData.titleRu,
        titleUz: formData.titleUz,
        summary: formData.summary,
        summaryRu: formData.summaryRu,
        summaryUz: formData.summaryUz,
        content: withGallery(formData.content, normalizedGallery),
        contentRu: formData.contentRu,
        contentUz: formData.contentUz,
        image: primaryImage,
        imageCaption: formData.imageCaption,
        imageCaptionRu: formData.imageCaptionRu,
        imageCaptionUz: formData.imageCaptionUz,
        author: formData.author,
        slug: formData.slug,
        category: formData.categories[0],
        categories: formData.categories.slice(0, 3),
      };
      if (id) {
        await updateArticle(id, payload as any);
        toast.success("Article updated successfully");
      } else {
        await addArticle(payload as any);
        toast.success("Article created successfully");
      }
      router.push("/admin/articles");
    } catch {
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

  const visibleGallery = useMemo(() => formData.gallery.map((url) => url.trim()).filter(Boolean), [formData.gallery]);

  const toggleCategory = (name: string) => {
    setFormData((prev) => {
      const has = prev.categories.includes(name);
      if (has) return { ...prev, categories: prev.categories.filter((c) => c !== name) };
      if (prev.categories.length >= 3) return prev;
      return { ...prev, categories: [...prev.categories, name] };
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/articles" className="p-2 rounded-full hover:bg-muted transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-bold font-serif">{id ? "Edit Article" : "New Article"}</h1>
        </div>
        <button onClick={handleSubmit} disabled={isLoading} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {id ? "Update" : "Publish"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex border-b border-border/40">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Globe className="inline-block h-3.5 w-3.5 mr-1.5" />{tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 rounded-xl border border-border/40 bg-card space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title ({activeTab.toUpperCase()})</label>
              <input type="text" className="w-full px-4 py-3 rounded-md border border-input bg-background font-medium text-lg" value={activeTab === "en" ? formData.title : activeTab === "ru" ? formData.titleRu : formData.titleUz} onChange={(e) => {
                if (activeTab === "en") setFormData({ ...formData, title: e.target.value });
                else if (activeTab === "ru") setFormData({ ...formData, titleRu: e.target.value });
                else setFormData({ ...formData, titleUz: e.target.value });
              }} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Summary ({activeTab.toUpperCase()})</label>
              <textarea className="w-full px-4 py-2 rounded-md border border-input bg-background min-h-[120px]" value={activeTab === "en" ? formData.summary : activeTab === "ru" ? formData.summaryRu : formData.summaryUz} onChange={(e) => {
                const key = activeTab === "en" ? "summary" : activeTab === "ru" ? "summaryRu" : "summaryUz";
                setFormData({ ...formData, [key]: e.target.value });
              }} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Content ({activeTab.toUpperCase()})</label>
              <textarea className="w-full px-4 py-2 rounded-md border border-input bg-background min-h-[360px]" value={activeTab === "en" ? formData.content : activeTab === "ru" ? formData.contentRu : formData.contentUz} onChange={(e) => {
                const key = activeTab === "en" ? "content" : activeTab === "ru" ? "contentRu" : "contentUz";
                setFormData({ ...formData, [key]: e.target.value });
              }} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-sm">
            <h3 className="font-bold flex items-center gap-2 text-sm"><ImageIcon className="h-4 w-4 text-primary" /> Media & Metadata</h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Primary Image URL</label>
              <input type="text" placeholder="https://..." className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between"><label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gallery images</label><button type="button" className="text-xs rounded-md border px-2 py-1" onClick={() => setFormData((prev) => ({ ...prev, gallery: [...prev.gallery, ""] }))}><Plus className="h-3 w-3 inline mr-1" />Add</button></div>
              <div className="space-y-2">
                {formData.gallery.map((img, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="text" value={img} onChange={(e) => setFormData((prev) => ({ ...prev, gallery: prev.gallery.map((g, i) => i === idx ? e.target.value : g) }))} placeholder={`Image ${idx + 1} URL`} className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
                    {formData.gallery.length > 1 && <button type="button" onClick={() => setFormData((prev) => ({ ...prev, gallery: prev.gallery.filter((_, i) => i !== idx) }))} className="rounded-md border px-2 py-2"><X className="h-3.5 w-3.5" /></button>}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caption ({activeTab.toUpperCase()})</label>
              <input type="text" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" value={activeTab === "en" ? formData.imageCaption : activeTab === "ru" ? formData.imageCaptionRu : formData.imageCaptionUz} onChange={(e) => {
                const key = activeTab === "en" ? "imageCaption" : activeTab === "ru" ? "imageCaptionRu" : "imageCaptionUz";
                setFormData({ ...formData, [key]: e.target.value });
              }} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories (max 3)</label>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...allCategories, ...formData.categories])].map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)} className={`rounded-full border px-3 py-1 text-xs ${formData.categories.includes(cat) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>{cat}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Create category" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" />
                <button type="button" className="rounded-md border px-3" onClick={() => {
                  const name = newCategory.trim();
                  if (!name) return;
                  setAllCategories((prev) => prev.includes(name) ? prev : [...prev, name]);
                  setNewCategory("");
                  toggleCategory(name);
                }}>Add</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Author</label>
              <input type="text" className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} />
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL Slug</label>
              <input type="text" className="w-full px-3 py-2 rounded-md border border-input bg-muted/50 text-xs" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-border/40 bg-card space-y-4">
            <h3 className="font-semibold text-sm">Preview</h3>
            <div className="grid grid-cols-2 gap-2">
              {(visibleGallery.length ? visibleGallery : [formData.image]).filter(Boolean).map((img, idx) => (
                <div key={`${img}-${idx}`} className="aspect-video rounded-md bg-muted overflow-hidden relative border border-border/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {!(visibleGallery.length || formData.image) && <div className="col-span-2 flex items-center justify-center h-28 rounded-md border border-dashed text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>}
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
