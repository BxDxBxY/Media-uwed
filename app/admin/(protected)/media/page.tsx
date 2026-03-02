"use client";

import { useGlobalContext } from "@/lib/context";
import { Plus, Trash2, Video, Image as ImageIcon, ExternalLink, Play, Eye, Edit2, Save, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);

    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;

    const v = u.searchParams.get("v");
    if (v) return v;

    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "shorts" || p === "embed");
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];

    return null;
  } catch {
    return null;
  }
}

function resolvePreviewSrc(item: {
  type: string;
  url?: string | null;
  thumbnail?: string | null;
}): string | undefined {
  const url = item.url ?? undefined;
  const thumb = item.thumbnail ?? undefined;

  // Always use provided thumbnail first
  if (thumb) return thumb;

  // If it's a video, try to derive YouTube thumbnail
  if (item.type === "video" && url) {
    const ytId = getYouTubeId(url);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;

    // No universal thumbnail for arbitrary video URLs without server-side work
    return undefined;
  }

  // Non-video: url is probably an image
  return url;
}

export default function AdminMediaPage() {
    const { media, addMedia, deleteMedia, isLoading, updateMedia } = useGlobalContext();
    const [isAdding, setIsAdding] = useState(false);
    const [editingMedia, setEditingMedia] = useState<any>(null);
    const [newMedia, setNewMedia] = useState({
        type: "image" as "image" | "video",
        title: "",
        url: "",
        thumbnail: "",
        category: "General",
    });
    

    
    const handleSaveEdit = async () => {
        if (!editingMedia) return;
        try {
            await updateMedia(editingMedia.id, editingMedia);
            setEditingMedia(null);
            toast.success("Media updated!");
        } catch (error) {
            toast.error("Failed to update media");
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addMedia(newMedia as any);
            setNewMedia({
                type: "image",
                title: "",
                url: "",
                thumbnail: "",
                category: "General"
            });
            setIsAdding(false);
            toast.success("Media added");
        } catch (e) {
            toast.error("Failed to add media");
        }
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground italic">Updating gallery...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-serif font-bold">Media Management</h1>
                    <p className="text-sm text-muted-foreground">Manage your images and video library.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                >
                    <Plus className="h-4 w-4" /> Add Media
                </button>
            </div>

            {/* Editing Modal */}
            {editingMedia && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-serif font-bold">Edit Media Item</h2>
                            <button onClick={() => setEditingMedia(null)} className="p-2 hover:bg-muted rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Title</label>
                                <input
                                    value={editingMedia.title}
                                    onChange={(e) => setEditingMedia({ ...editingMedia, title: e.target.value })}
                                    className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">URL (Image or Video)</label>
                                <input
                                    value={editingMedia.url}
                                    onChange={(e) => setEditingMedia({ ...editingMedia, url: e.target.value })}
                                    className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Thumbnail URL (Optional)</label>
                                <input
                                    value={editingMedia.thumbnail || ""}
                                    onChange={(e) => setEditingMedia({ ...editingMedia, thumbnail: e.target.value })}
                                    placeholder="Leave empty for auto-generation (YouTube)"
                                    className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Type</label>
                                    <select
                                        value={editingMedia.type}
                                        onChange={(e) => setEditingMedia({ ...editingMedia, type: e.target.value as any })}
                                        className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                    >
                                        <option value="image">Image</option>
                                        <option value="video">Video</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Category</label>
                                    <input
                                        value={editingMedia.category}
                                        onChange={(e) => setEditingMedia({ ...editingMedia, category: e.target.value })}
                                        className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold hover:opacity-90 flex items-center justify-center gap-2"
                                >
                                    <Save className="h-4 w-4" /> Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingMedia(null)}
                                    className="flex-1 bg-muted py-2 rounded-xl font-bold hover:bg-muted/80"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAdding && (
                <form onSubmit={handleAdd} className="p-6 rounded-2xl border border-border/40 bg-card space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-serif font-bold text-lg text-primary">Add New Media</h3>
                        <div className="bg-primary/5 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase">Uploader</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Title</label>
                            <input
                                required
                                value={newMedia.title}
                                onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                                placeholder="Media Title"
                                className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Type</label>
                            <select
                                value={newMedia.type}
                                onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value as any })}
                                className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">URL</label>
                            <input
                                required
                                value={newMedia.url}
                                onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                                placeholder="https://..."
                                className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Thumbnail URL (Optional)</label>
                            <input
                                value={newMedia.thumbnail || "https://i3.ytimg.com/vi/<insert-youtube-video-id-here>/hqdefault.jpg"}
                                onChange={(e) => setNewMedia({ ...newMedia, thumbnail: e.target.value })}
                                placeholder="Auto-fetched if YouTube"
                                className="w-full bg-muted border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl font-bold hover:opacity-90 transition-opacity">
                            Add to Gallery
                        </button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 rounded-xl font-bold hover:bg-muted transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {media.map((item) => {
  const imgSrc = resolvePreviewSrc(item);

  return (
    <div
      key={item.id}
      className="group relative bg-card rounded-xl border border-border/40 overflow-hidden shadow-sm"
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // If derived URL fails, hide image and show fallback
              const el = e.currentTarget;
              el.style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditingMedia(item)}
            className="p-2 bg-white/90 backdrop-blur-sm text-primary rounded-lg shadow-sm hover:bg-white"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => confirm("Delete this media?") && deleteMedia(item.id)}
            className="p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-lg shadow-sm hover:bg-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute bottom-2 right-2">
          {item.type === "video" ? (
            <Video className="h-5 w-5 text-white drop-shadow-md" />
          ) : (
            <ImageIcon className="h-5 w-5 text-white drop-shadow-md" />
          )}
        </div>

        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-bold uppercase tracking-wider">
            {item.type === "video" ? (
              <Play className="h-3 w-3 inline mr-1" />
            ) : (
              <Eye className="h-3 w-3 inline mr-1" />
            )}
            {item.type}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-sm mb-1 truncate">{item.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">
            {item.category}
          </span>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
})}
            </div>
            {media.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-border/40 rounded-2xl">
                    <p className="text-muted-foreground italic">Your media gallery library is empty. Start by adding images or videos!</p>
                </div>
            )}
        </div>
    );
}
