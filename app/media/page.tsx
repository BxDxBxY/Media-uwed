"use client";

import { useGlobalContext } from "@/lib/context";
import { Play, Image as ImageIcon, Search, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function getEmbedUrl(url: string) {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const idMatch = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&#]+)/);
    const id = idMatch ? idMatch[1] : "";
    return `https://www.youtube.com/embed/${id}?rel=0`;
  }
  if (url.includes("yandex.ru/video")) {
    return url.replace("/preview/", "/embed/");
  }
  return url;
}

function getPreview(item: any) {
  if (item.type !== "video") return item.url;
  if (item.thumbnail) return item.thumbnail;
  const id = item.url.match(/[?&]v=([^&]+)/)?.[1] || item.url.match(/youtu\.be\/([^?&#]+)/)?.[1];
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : item.url;
}

function isEmbeddableVideo(url: string) {
  return /youtube\.com|youtu\.be|yandex\.ru\/video/.test(url);
}

export default function MediaPage() {
  const { media, isLoading } = useGlobalContext();
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);

  const categories = ["All", ...Array.from(new Set(media.map((m) => m.category || "General")))].filter(Boolean);

  const filteredMedia = useMemo(
    () =>
      media.filter((item) => {
        const matchesFilter = filter === "All" || item.category === filter;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
      }),
    [media, filter, searchQuery],
  );

  const selectedItem = selectedItemIndex >= 0 ? filteredMedia[selectedItemIndex] : null;

  const handleNext = () => {
    if (filteredMedia.length === 0) return;
    setSelectedItemIndex((prev) => (prev + 1) % filteredMedia.length);
  };

  const handlePrev = () => {
    if (filteredMedia.length === 0) return;
    setSelectedItemIndex((prev) => (prev - 1 + filteredMedia.length) % filteredMedia.length);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedItem) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSelectedItemIndex(-1);
      } else if ((e.key === " " || e.key === "Enter") && selectedItem.type === "video") {
        if (nativeVideoRef.current) {
          e.preventDefault();
          if (nativeVideoRef.current.paused) nativeVideoRef.current.play();
          else nativeVideoRef.current.pause();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItem]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground font-serif">Developing gallery...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">Media Gallery</h1>

        <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setFilter(cat);
                  setSelectedItemIndex(-1);
                }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  filter === cat ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search gallery..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedItemIndex(-1);
              }}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMedia.map((item, index) => (
          <div key={item.id} className="group relative cursor-pointer" onClick={() => setSelectedItemIndex(index)}>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted border border-border/40 relative">
              <img src={getPreview(item)} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {item.type === "video" ? (
                  <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center text-primary shadow-xl scale-90 group-hover:scale-100 transition-transform">
                    <Play className="h-6 w-6 fill-current ml-1" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center text-primary shadow-xl scale-90 group-hover:scale-100 transition-transform">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 px-1">
              <span className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1 block">{item.category}</span>
              <h3 className="font-bold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
            </div>
          </div>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-muted-foreground font-serif italic">No media items match your search.</p>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl bg-card rounded-2xl overflow-hidden shadow-2xl border border-border/40 group/modal">
            <button onClick={() => setSelectedItemIndex(-1)} className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors text-white">
              <X className="h-5 w-5" />
            </button>

            <button onClick={handlePrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-all opacity-0 group-hover/modal:opacity-100">
              <ChevronLeft className="h-8 w-8" />
            </button>

            <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-all opacity-0 group-hover/modal:opacity-100">
              <ChevronRight className="h-8 w-8" />
            </button>

            <div className="aspect-video bg-black flex items-center justify-center">
              {selectedItem.type === "video" ? (
                isEmbeddableVideo(selectedItem.url) ? (
                  <iframe className="w-full h-full" src={getEmbedUrl(selectedItem.url)} title={selectedItem.title} allowFullScreen />
                ) : (
                  <video ref={nativeVideoRef} className="w-full h-full" controls autoPlay src={selectedItem.url} />
                )
              ) : (
                <img src={selectedItem.url} alt={selectedItem.title} className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <div className="p-6 md:p-8">
              <span className="text-xs font-bold text-primary uppercase tracking-widest mb-2 block">{selectedItem.category}</span>
              <h2 className="text-2xl font-serif font-bold mb-2">{selectedItem.title}</h2>
              <p className="text-xs text-muted-foreground">Keyboard: ← → navigate • Esc close • Enter/Space play (for supported video)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
