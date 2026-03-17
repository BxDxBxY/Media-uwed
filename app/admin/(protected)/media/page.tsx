"use client";

import { useGlobalContext } from "@/lib/context";
import { Plus, Trash2, Video, Image as ImageIcon, ExternalLink, Play, Eye, Edit2, X, ChevronLeft, ChevronRight, Table2, LayoutGrid } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getMediaPreviewUrl, getVideoEmbedUrl } from "@/lib/media-utils";
import { toast } from "sonner";


export default function AdminMediaPage() {
  const { media, addMedia, deleteMedia, isLoading, updateMedia } = useGlobalContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingMedia, setEditingMedia] = useState<any>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "type_asc" | "type_desc">("date_desc");
  const [newMedia, setNewMedia] = useState({ type: "image" as "image" | "video", title: "", url: "", thumbnail: "", category: "General" });

  const sortedMedia = useMemo(() => {
    const copy = [...media];
    copy.sort((a, b) => {
      if (sortBy === "type_asc") return (a.type || "").localeCompare(b.type || "");
      if (sortBy === "type_desc") return (b.type || "").localeCompare(a.type || "");
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return sortBy === "date_asc" ? aDate - bDate : bDate - aDate;
    });
    return copy;
  }, [media, sortBy]);

  const selectedItem = selectedIndex >= 0 ? sortedMedia[selectedIndex] : null;

  const handleSaveEdit = async () => {
    if (!editingMedia) return;
    try {
      await updateMedia(editingMedia.id, editingMedia);
      setEditingMedia(null);
      toast.success("Media updated!");
    } catch {
      toast.error("Failed to update media");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMedia(newMedia as any);
      setNewMedia({ type: "image", title: "", url: "", thumbnail: "", category: "General" });
      setIsAdding(false);
      toast.success("Media added");
    } catch {
      toast.error("Failed to add media");
    }
  };

  const handleNext = () => {
    if (sortedMedia.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % sortedMedia.length);
  };

  const handlePrev = () => {
    if (sortedMedia.length === 0) return;
    setSelectedIndex((prev) => (prev - 1 + sortedMedia.length) % sortedMedia.length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selectedIndex < 0) return;
      if (e.key === "Escape") setSelectedIndex(-1);
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, handleNext, handlePrev]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground italic">Updating gallery...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold">Media Management</h1>
          <p className="text-sm text-muted-foreground">Manage your images and video library.</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm">
            <option value="date_desc">Date: Newest first</option>
            <option value="date_asc">Date: Oldest first</option>
            <option value="type_asc">Type: A → Z</option>
            <option value="type_desc">Type: Z → A</option>
          </select>
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md border ${viewMode === "grid" ? "bg-primary text-primary-foreground" : ""}`}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setViewMode("table")} className={`p-2 rounded-md border ${viewMode === "table" ? "bg-primary text-primary-foreground" : ""}`}><Table2 className="h-4 w-4" /></button>
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
            <Plus className="h-4 w-4" /> Add Media
          </button>
        </div>
      </div>

      {editingMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold">Edit Media Item</h2>
              <button onClick={() => setEditingMedia(null)} className="p-2 hover:bg-muted rounded-full"><X className="h-5 w-5" /></button>
            </div>
            <input value={editingMedia.title} onChange={(e) => setEditingMedia({ ...editingMedia, title: e.target.value })} className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <input value={editingMedia.url} onChange={(e) => setEditingMedia({ ...editingMedia, url: e.target.value })} className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <input value={editingMedia.thumbnail || ""} onChange={(e) => setEditingMedia({ ...editingMedia, thumbnail: e.target.value })} className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <input value={editingMedia.category || "General"} onChange={(e) => setEditingMedia({ ...editingMedia, category: e.target.value })} className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <select value={editingMedia.type} onChange={(e) => setEditingMedia({ ...editingMedia, type: e.target.value })} className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm">
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
            <button onClick={handleSaveEdit} className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-bold">Save Changes</button>
          </div>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold">Add New Media</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input required value={newMedia.title} onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })} placeholder="Title" className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <input value={newMedia.category} onChange={(e) => setNewMedia({ ...newMedia, category: e.target.value })} placeholder="Categories (comma separated)" className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <input required value={newMedia.url} onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })} placeholder="https://..." className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
            <input value={newMedia.thumbnail} onChange={(e) => setNewMedia({ ...newMedia, thumbnail: e.target.value })} placeholder="Thumbnail (optional)" className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm" />
          </div>
          <select value={newMedia.type} onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value as any })} className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm">
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold">Add to Gallery</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 rounded-xl font-bold hover:bg-muted">Cancel</button>
          </div>
        </form>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedMedia.map((item, index) => (
            <div key={item.id} className="group relative cursor-pointer bg-card rounded-xl border border-border/40 overflow-hidden" onClick={() => setSelectedIndex(index)}>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted border-b border-border/40 relative">
                <img src={getMediaPreviewUrl(item)} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {item.type === "video" ? <Play className="h-8 w-8 text-foreground" /> : <Eye className="h-8 w-8 text-foreground" />}
                </div>
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditingMedia(item); }} className="p-2 bg-white/90 text-primary rounded-lg"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); confirm("Delete this media?") && deleteMedia(item.id); }} className="p-2 bg-red-500/90 text-foreground rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="absolute bottom-2 right-2">{item.type === "video" ? <Video className="h-5 w-5 text-foreground" /> : <ImageIcon className="h-5 w-5 text-foreground" />}</div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm mb-1 truncate">{item.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.category}</span>
                  {item.url ? <a href={item.url} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline"><ExternalLink className="h-4 w-4" /></a> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">Title</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Category</th>
                <th className="text-left py-3 px-4">Created</th>
                <th className="text-left py-3 px-4">URL</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedMedia.map((item) => (
                <tr key={item.id} className="border-t border-border/30">
                  <td className="py-3 px-4 font-medium">{item.title}</td>
                  <td className="py-3 px-4 uppercase text-xs">{item.type}</td>
                  <td className="py-3 px-4">{item.category || "General"}</td>
                  <td className="py-3 px-4">{item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}</td>
                  <td className="py-3 px-4 max-w-[260px] truncate"><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{item.url}</a></td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button onClick={() => setEditingMedia(item)} className="px-2 py-1 text-xs rounded border">Edit</button>
                      <button onClick={() => confirm("Delete this media?") && deleteMedia(item.id)} className="px-2 py-1 text-xs rounded border border-red-400 text-red-500">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl bg-card rounded-2xl overflow-hidden shadow-2xl border border-border/40 group/modal">
            <button onClick={() => setSelectedIndex(-1)} className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-background/70 hover:bg-background/90 border border-border/50 flex items-center justify-center text-foreground"><X className="h-5 w-5" /></button>
            <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-foreground transition-all opacity-0 group-hover/modal:opacity-100"><ChevronLeft className="h-8 w-8" /></button>
            <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-foreground transition-all opacity-0 group-hover/modal:opacity-100"><ChevronRight className="h-8 w-8" /></button>

            <div className="aspect-video bg-black flex items-center justify-center">
              {selectedItem.type === "video" ? <iframe className="w-full h-full" src={getVideoEmbedUrl(selectedItem.url) || selectedItem.url} title={selectedItem.title} allowFullScreen /> : <img src={selectedItem.url} alt={selectedItem.title} className="max-h-full max-w-full object-contain" />}
            </div>
            <div className="p-6 md:p-8">
              <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">{selectedItem.category}</span>
              <h2 className="text-2xl font-serif font-bold mb-4">{selectedItem.title}</h2>
            </div>
          </div>
        </div>
      )}

      {media.length === 0 && <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-2xl"><p className="text-muted-foreground italic">Your media gallery library is empty. Start by adding images or videos!</p></div>}
    </div>
  );
}
