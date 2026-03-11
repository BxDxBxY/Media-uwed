"use client";

import { Eye, Loader2, Save, Trash2 } from "lucide-react";
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

export function AdminStaticPageEditor({ slug, heading }: { slug: Slug; heading: string }) {
  const [draft, setDraft] = useState<Draft>({ slug, title: "", titleRu: "", titleUz: "", content: "", contentRu: "", contentUz: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeLang, setActiveLang] = useState<LangKey>("en");
  const [previewMode, setPreviewMode] = useState(false);

  const currentMeta = useMemo(() => languageMeta.find((x) => x.key === activeLang)!, [activeLang]);
  const contentId = `content-${currentMeta.key}`;

  const getCurrentContent = () => String(draft[currentMeta.contentKey] || "");

  const setCurrentField = (field: keyof Draft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const wrapSelection = (id: string, before: string, after: string = before) => {
    const element = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!element) return;

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const value = element.value;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

    setCurrentField(currentMeta.contentKey, next);

    requestAnimationFrame(() => {
      element.focus();
      const pos = start + before.length + selected.length + after.length;
      element.setSelectionRange(pos, pos);
    });
  };

  const insertTemplate = (id: string, template: string) => {
    const element = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!element) return;

    const cursor = element.selectionStart ?? element.value.length;
    const next = `${element.value.slice(0, cursor)}${template}${element.value.slice(cursor)}`;
    setCurrentField(currentMeta.contentKey, next);
    requestAnimationFrame(() => {
      element.focus();
      const pos = cursor + template.length;
      element.setSelectionRange(pos, pos);
    });
  };

  const EditorTools = ({ id }: { id: string }) => (
    <div className="flex flex-wrap gap-2 pb-2">
      <button type="button" onClick={() => wrapSelection(id, "<strong>", "</strong>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Bold</button>
      <button type="button" onClick={() => wrapSelection(id, "<em>", "</em>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Italic</button>
      <button type="button" onClick={() => wrapSelection(id, "<h2>", "</h2>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">H2</button>
      <button type="button" onClick={() => wrapSelection(id, "<h3>", "</h3>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">H3</button>
      <button type="button" onClick={() => wrapSelection(id, "<blockquote>", "</blockquote>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Quote</button>
      <button type="button" onClick={() => wrapSelection(id, "<ul>\n<li>", "</li>\n</ul>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">List</button>
      <button type="button" onClick={() => wrapSelection(id, "<ol>\n<li>", "</li>\n</ol>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Numbered</button>
      <button type="button" onClick={() => insertTemplate(id, '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link text</a>')} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Link</button>
      <button type="button" onClick={() => insertTemplate(id, "<hr />\n")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Divider</button>
    </div>
  );

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
      toast.error("Title and EN content are required.");
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

      <div className="rounded-xl border border-border/40 bg-card p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {languageMeta.map((lang) => (
            <button
              key={lang.key}
              type="button"
              onClick={() => setActiveLang(lang.key)}
              className={`px-3 py-1.5 rounded-md text-sm border ${activeLang === lang.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
            >
              {lang.label}
            </button>
          ))}
          <button type="button" onClick={() => setPreviewMode((v) => !v)} className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border hover:bg-muted text-sm">
            <Eye className="h-4 w-4" /> {previewMode ? "Edit" : "Preview"}
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">{currentMeta.label} title</label>
          <input
            value={String(draft[currentMeta.titleKey] || "")}
            onChange={(e) => setCurrentField(currentMeta.titleKey, e.target.value)}
            placeholder={`Title (${currentMeta.label})`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        {!previewMode ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">{currentMeta.label} content</label>
            <EditorTools id={contentId} />
            <textarea
              id={contentId}
              rows={18}
              value={getCurrentContent()}
              onChange={(e) => setCurrentField(currentMeta.contentKey, e.target.value)}
              placeholder={`Content (${currentMeta.label})`}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Preview ({currentMeta.label})</label>
            <div
              className="rounded-lg border border-border/40 bg-background p-4 md:p-6 leading-7 text-base [&_p]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: getCurrentContent() }}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: edit one language at a time for better readability. English content/title are required; RU/UZ can be optional fallbacks.
      </p>
    </div>
  );
}
