"use client";

import { ChevronDown, Eye, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Slug = "privacy-policy" | "terms-of-use";
type LangKey = "en" | "ru" | "uz";

type Draft = {
  slug: Slug;
  title: string;
  titleRu: string;
  titleUz: string;
  content: string;
  contentRu: string;
  contentUz: string;
};

const languageMeta: Array<{ key: LangKey; label: string; titleKey: keyof Draft; contentKey: keyof Draft }> = [
  { key: "en", label: "English", titleKey: "title", contentKey: "content" },
  { key: "ru", label: "Russian", titleKey: "titleRu", contentKey: "contentRu" },
  { key: "uz", label: "Uzbek", titleKey: "titleUz", contentKey: "contentUz" },
];

const templateButtons = [
  { label: "Heading", value: "<h2>Section title</h2>\n<p>Paragraph text...</p>" },
  { label: "List", value: "<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>" },
  { label: "Quote", value: "<blockquote>Important legal note</blockquote>" },
  { label: "Divider", value: "<hr />" },
  { label: "Link", value: '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">Reference link</a></p>' },
];

export function AdminStaticPageEditor({ slug, heading }: { slug: Slug; heading: string }) {
  const [draft, setDraft] = useState<Draft>({ slug, title: "", titleRu: "", titleUz: "", content: "", contentRu: "", contentUz: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeLang, setActiveLang] = useState<LangKey>("en");
  const [previewLang, setPreviewLang] = useState<LangKey | null>(null);

  const setCurrentField = (field: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const insertTemplate = (contentKey: keyof Draft, template: string) => {
    const current = String(draft[contentKey] || "");
    const merged = current.trim() ? `${current}\n\n${template}` : template;
    setCurrentField(contentKey, merged);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/static-pages?slug=${slug}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load page");
        setDraft({
          slug,
          title: data.page?.title || "",
          titleRu: data.page?.titleRu || "",
          titleUz: data.page?.titleUz || "",
          content: data.page?.content || "",
          contentRu: data.page?.contentRu || "",
          contentUz: data.page?.contentUz || "",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load page content");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const save = async () => {
    if (!draft.title.trim() || !draft.content.trim()) {
      toast.error("English title and English content are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/static-pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save");
      toast.success("Saved successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      const response = await fetch(`/api/admin/static-pages?slug=${slug}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset");
      setDraft({
        slug,
        title: data.page?.title || "",
        titleRu: data.page?.titleRu || "",
        titleUz: data.page?.titleUz || "",
        content: data.page?.content || "",
        contentRu: data.page?.contentRu || "",
        contentUz: data.page?.contentUz || "",
      });
      toast.success("Reset to default content");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset page");
    } finally {
      setResetting(false);
    }
  };

  const activeLanguage = languageMeta.find((lang) => lang.key === activeLang) || languageMeta[0];

  const previewData = useMemo(() => {
    const lang = previewLang || "en";
    if (lang === "ru") return { title: draft.titleRu || draft.title, content: draft.contentRu || draft.content };
    if (lang === "uz") return { title: draft.titleUz || draft.title, content: draft.contentUz || draft.content };
    return { title: draft.title, content: draft.content };
  }, [draft, previewLang]);

  if (loading) return <div className="p-8 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading page data...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-serif font-bold">{heading}</h1>
        <div className="flex gap-2">
          <button onClick={reset} disabled={resetting || saving} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60">
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Reset
          </button>
          <button onClick={save} disabled={saving || resetting} className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border/40 bg-card p-4">
        <div className="flex flex-wrap gap-2">
          {languageMeta.map((lang) => (
            <button
              key={lang.key}
              type="button"
              onClick={() => setActiveLang(lang.key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${activeLang === lang.key ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              Edit {lang.label}
            </button>
          ))}
        </div>

        <section className="space-y-3 rounded-lg border border-border/40 bg-background/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{activeLanguage.label}</h2>
          <input
            value={String(draft[activeLanguage.titleKey] || "")}
            onChange={(e) => setCurrentField(activeLanguage.titleKey, e.target.value)}
            placeholder={`Title (${activeLanguage.label})`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {templateButtons.map((btn) => (
              <button key={`${activeLanguage.key}-${btn.label}`} type="button" onClick={() => insertTemplate(activeLanguage.contentKey, btn.value)} className="rounded border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted">
                + {btn.label}
              </button>
            ))}
          </div>
          <textarea
            value={String(draft[activeLanguage.contentKey] || "")}
            onChange={(e) => setCurrentField(activeLanguage.contentKey, e.target.value)}
            placeholder={`Content (${activeLanguage.label}) — HTML is supported.`}
            className="min-h-[320px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 font-mono"
          />
        </section>
      </div>

      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold inline-flex items-center gap-2"><Eye className="h-4 w-4" /> Preview</h3>
          <div className="flex gap-2">
            {languageMeta.map((lang) => (
              <button
                key={`preview-${lang.key}`}
                onClick={() => setPreviewLang((prev) => (prev === lang.key ? null : lang.key))}
                className={`px-3 py-1 rounded-md text-xs border inline-flex items-center gap-1 ${previewLang === lang.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
              >
                {lang.label}
                <ChevronDown className={`h-3 w-3 transition-transform ${previewLang === lang.key ? "rotate-180" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        {previewLang ? (
          <>
            <h4 className="text-xl font-serif font-bold">{previewData.title || "Untitled"}</h4>
            <div
              className="rounded-lg border border-border/40 bg-background p-4 md:p-6 leading-7 text-base [&_p]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: previewData.content || "<p>No content yet.</p>" }}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Choose a language button to open preview.</p>
        )}
      </div>
    </div>
  );
}
