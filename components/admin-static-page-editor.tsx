"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Slug = "privacy-policy" | "terms-of-use";

type Draft = {
  slug: Slug;
  title: string;
  titleRu: string;
  titleUz: string;
  content: string;
  contentRu: string;
  contentUz: string;
};

export function AdminStaticPageEditor({ slug, heading }: { slug: Slug; heading: string }) {
  const [draft, setDraft] = useState<Draft>({ slug, title: "", titleRu: "", titleUz: "", content: "", contentRu: "", contentUz: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const wrapSelection = (id: string, before: string, after: string = before) => {
    const element = document.getElementById(id) as HTMLTextAreaElement | null;
    if (!element) return;

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const value = element.value;
    const selected = value.slice(start, end) || "text";
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

    const key = id.replace("content-", "") as "content" | "contentRu" | "contentUz";
    setDraft((prev) => ({ ...prev, [key]: next }));

    requestAnimationFrame(() => {
      element.focus();
      const pos = start + before.length + selected.length + after.length;
      element.setSelectionRange(pos, pos);
    });
  };

  const EditorTools = ({ id }: { id: string }) => (
    <div className="flex flex-wrap gap-2 pb-2">
      <button type="button" onClick={() => wrapSelection(id, "<strong>", "</strong>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Bold</button>
      <button type="button" onClick={() => wrapSelection(id, "<mark>", "</mark>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Highlight</button>
      <button type="button" onClick={() => wrapSelection(id, "<h2>", "</h2>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">H2</button>
      <button type="button" onClick={() => wrapSelection(id, "<h3>", "</h3>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">H3</button>
      <button type="button" onClick={() => wrapSelection(id, "<blockquote>", "</blockquote>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Quote</button>
      <button type="button" onClick={() => wrapSelection(id, "<ul><li>", "</li></ul>")} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">List</button>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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

      <div className="grid md:grid-cols-3 gap-3">
        <input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title (EN)" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input value={draft.titleRu} onChange={(e) => setDraft((prev) => ({ ...prev, titleRu: e.target.value }))} placeholder="Title (RU)" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input value={draft.titleUz} onChange={(e) => setDraft((prev) => ({ ...prev, titleUz: e.target.value }))} placeholder="Title (UZ)" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <EditorTools id="content-content" />
          <textarea id="content-content" rows={14} value={draft.content} onChange={(e) => setDraft((prev) => ({ ...prev, content: e.target.value }))} placeholder="Content (EN)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <EditorTools id="content-contentRu" />
          <textarea id="content-contentRu" rows={14} value={draft.contentRu} onChange={(e) => setDraft((prev) => ({ ...prev, contentRu: e.target.value }))} placeholder="Content (RU)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <EditorTools id="content-contentUz" />
          <textarea id="content-contentUz" rows={14} value={draft.contentUz} onChange={(e) => setDraft((prev) => ({ ...prev, contentUz: e.target.value }))} placeholder="Content (UZ)" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
      </div>
    </div>
  );
}
