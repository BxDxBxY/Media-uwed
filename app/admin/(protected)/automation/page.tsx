"use client";

import {
    Rss,
    RefreshCw,
    Power,
    Brain,
    Rocket,
    Loader2,
    Edit3,
    Trash2,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    X,
    Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGlobalContext } from "@/lib/context";

type Tab = "review" | "raw";
type Lang = "en" | "ru" | "uz";

export default function AutomationPage() {
    const { sources, refreshData } = useGlobalContext();

    const [newSource, setNewSource] = useState({ name: "", url: "" });

    const [isProcessing, setIsProcessing] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);

    const [processedItems, setProcessedItems] = useState<any[]>([]);
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [isLoadingReview, setIsLoadingReview] = useState(false);
    const [isLoadingRaw, setIsLoadingRaw] = useState(false);

    const [activeTab, setActiveTab] = useState<Tab>("review");
    const [selectedRawIds, setSelectedRawIds] = useState<string[]>([]);

    const [selectedReviewItem, setSelectedReviewItem] = useState<any>(null);

    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const itemsPerPage = 5;

    const [lang, setLang] = useState<Lang>("en");

    const fetchReviewItems = async () => {
        setIsLoadingReview(true);
        try {
            const res = await fetch("/api/admin/automation/review");
            if (!res.ok) return;
            const data = await res.json();
            setProcessedItems(data.items || []);
        } catch (e) {
            console.error("Failed to fetch review items", e);
        } finally {
            setIsLoadingReview(false);
        }
    };

    const fetchRawItems = async () => {
        setIsLoadingRaw(true);
        try {
            const res = await fetch("/api/admin/automation/raw");
            if (!res.ok) return;
            const data = await res.json();
            setRawItems(data.items || []);
        } catch (e) {
            console.error("Failed to fetch raw items", e);
        } finally {
            setIsLoadingRaw(false);
        }
    };

    useEffect(() => {
        fetchReviewItems();
        fetchRawItems();
    }, []);

    // Reset pagination when switching view
    useEffect(() => {
        setPage(1);
    }, [sortBy, processedItems.length]);

    const handleSync = async () => {
        setIsProcessing(true);
        toast.info("Triggering news pull...");
        try {
            const res = await fetch("/api/cron/pull", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(`Sync complete: Fetched ${data.itemsFetched ?? "?"} items.`);
                refreshData();
                fetchRawItems();
            } else {
                toast.error(data.error || "Sync failed");
            }
        } catch {
            toast.error("Network error during sync");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleProcess = async () => {
        setIsProcessing(true);
        toast.info("Triggering processing...");
        try {
            const res = await fetch("/api/cron/process", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(`Processing complete: ${data.processedCount ?? "?"} items processed.`);
                fetchReviewItems();
                fetchRawItems();
            } else {
                toast.error(data.error || "Processing failed");
            }
        } catch {
            toast.error("Network error during processing");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTranslateSelected = async () => {
        if (selectedRawIds.length === 0) return toast.warning("Select items to translate first");

        setIsTranslating(true);
        toast.info(`Translating ${selectedRawIds.length} items...`);

        try {
            const res = await fetch("/api/cron/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedRawIds }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                toast.success(`Processing complete: ${data.processedCount ?? "?"} items processed.`);
                setSelectedRawIds([]);
                fetchReviewItems();
                fetchRawItems();
            } else {
                toast.error(data.error || "Processing failed");
            }
        } catch {
            toast.error("Network error during processing");
        } finally {
            setIsTranslating(false);
        }
    };

    const handlePublish = async () => {
        setIsProcessing(true);
        toast.info("Triggering publishing of approved articles...");
        try {
            const res = await fetch("/api/cron/publish", { method: "POST" });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                if ((data.publishedCount ?? 0) > 0) {
                    toast.success(`Publishing complete: ${data.publishedCount} articles live.`);
                    fetchReviewItems();
                    refreshData();
                } else {
                    toast.warning(data.message || "Nothing to publish");
                }
            } else {
                toast.error(data.error || "Publishing failed");
            }
        } catch {
            toast.error("Network error during publishing");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const res = await fetch("/api/admin/automation/review", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            });
            if (res.ok) {
                toast.success(`Article ${newStatus.replaceAll("_", " ")}`);
                fetchReviewItems();
            } else {
                toast.error("Failed to update status");
            }
        } catch {
            toast.error("Failed to update status");
        }
    };

    const handleToggleSource = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/admin/sources`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, enabled: !currentStatus }),
            });
            if (res.ok) {
                toast.success("Source updated");
                refreshData();
            } else {
                toast.error("Failed to toggle source");
            }
        } catch {
            toast.error("Failed to toggle source");
        }
    };

    const handleDeleteSource = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            const res = await fetch(`/api/admin/sources?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Source deleted");
                refreshData();
            } else {
                toast.error("Failed to delete source");
            }
        } catch {
            toast.error("Failed to delete source");
        }
    };

    const handleAddSource = async () => {
        if (!newSource.name || !newSource.url) return toast.error("Please fill in all fields");

        try {
            const res = await fetch("/api/admin/sources", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newSource.name, feedUrl: newSource.url }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                refreshData();
                setNewSource({ name: "", url: "" });
                toast.success("Source added successfully!");
            } else {
                toast.error(data.error || "Failed to add source");
            }
        } catch {
            toast.error("Network error while adding source");
        }
    };

    const handleSaveDetail = async (id: string, updates: any) => {
        try {
            const res = await fetch("/api/admin/automation/review", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...updates }),
            });
            if (res.ok) {
                toast.success("Article updated");
                fetchReviewItems();
                setSelectedReviewItem(null);
            } else {
                toast.error("Failed to save changes");
            }
        } catch {
            toast.error("Failed to save changes");
        }
    };

    const sortedItems = useMemo(() => {
        const items = [...processedItems];
        items.sort((a, b) => {
            const at = new Date(a.createdAt).getTime();
            const bt = new Date(b.createdAt).getTime();
            return sortBy === "newest" ? bt - at : at - bt;
        });
        return items;
    }, [processedItems, sortBy]);

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / itemsPerPage));
    const safePage = Math.min(page, totalPages);

    const paginatedItems = useMemo(() => {
        const start = (safePage - 1) * itemsPerPage;
        return sortedItems.slice(start, start + itemsPerPage);
    }, [sortedItems, safePage]);

    const toggleRawSelection = (id: string) => {
        setSelectedRawIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const selectAllRawOnPage = () => {
        const ids = rawItems.map((x) => x.id).filter(Boolean);
        setSelectedRawIds(ids);
    };

    const clearRawSelection = () => setSelectedRawIds([]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-serif">Automation Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">News pipeline control</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSync}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
                        Sync
                    </button>

                    <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                    >
                        <Brain className="h-4 w-4" />
                        Process
                    </button>

                    <button
                        onClick={handlePublish}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                        <Rocket className="h-4 w-4" />
                        Publish
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left column */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Tabs */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => setActiveTab("review")}
                                className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "review"
                                        ? "text-primary border-b-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                type="button"
                            >
                                Review Queue ({processedItems.length})
                            </button>

                            <button
                                onClick={() => setActiveTab("raw")}
                                className={`pb-2 text-sm font-bold transition-all relative ${activeTab === "raw"
                                        ? "text-primary border-b-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                type="button"
                            >
                                Raw Items ({rawItems.length})
                            </button>
                        </div>

                        {activeTab === "review" ? (
                            <div className="flex items-center gap-3">
                                <select
                                    className="bg-muted text-xs font-bold px-2 py-1 rounded-md outline-none"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={selectAllRawOnPage}
                                    className="px-3 py-1.5 rounded-md bg-muted text-xs font-bold hover:bg-muted/80"
                                    type="button"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={clearRawSelection}
                                    className="px-3 py-1.5 rounded-md bg-muted text-xs font-bold hover:bg-muted/80"
                                    type="button"
                                >
                                    Clear
                                </button>
                                <button
                                    disabled={selectedRawIds.length === 0 || isTranslating}
                                    onClick={handleTranslateSelected}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50 transition-all"
                                    type="button"
                                >
                                    {isTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                                    Translate Selected ({selectedRawIds.length})
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    {activeTab === "review" ? (
                        <>
                            {isLoadingReview ? (
                                <div className="p-12 text-center text-muted-foreground">Loading queue...</div>
                            ) : processedItems.length === 0 ? (
                                <div className="p-12 text-center border border-dashed rounded-xl text-muted-foreground">
                                    No articles pending review. Run “Process” to generate new content.
                                </div>
                            ) : (
                                <>
                                    {/* Language toggle */}
                                    <div className="flex items-center justify-end gap-2 pb-3">
                                        {(["en", "ru", "uz"] as const).map((l) => (
                                            <button
                                                key={l}
                                                onClick={() => setLang(l)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${lang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                                                    }`}
                                                type="button"
                                            >
                                                {l.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>

                                    {paginatedItems.map((item) => {
                                        const isSelected = selectedReviewItem?.id === item.id;

                                        const getHeadline = () => {
                                            const byLang =
                                                lang === "en" ? item.headlineEn : lang === "ru" ? item.headlineRu : item.headlineUz;
                                            return byLang || item.headlineEn || item.headlineRu || item.headlineUz || item.raw?.title || "Untitled";
                                        };

                                        const getSummary = () => {
                                            const byLang = lang === "en" ? item.summaryEn : lang === "ru" ? item.summaryRu : item.summaryUz;
                                            return byLang || item.summaryEn || item.summaryRu || item.summaryUz || item.raw?.description || "";
                                        };

                                        const prettyStatus = String(item.status || "").replaceAll("_", " ");

                                        return (
                                            <div
                                                key={item.id}
                                                className={`p-5 rounded-xl border bg-card transition-all space-y-3 cursor-pointer ${isSelected
                                                        ? "border-primary/50 ring-2 ring-primary/20"
                                                        : "border-border/40 hover:border-primary/20 hover:shadow-sm"
                                                    }`}
                                                onClick={() => setSelectedReviewItem(item)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") setSelectedReviewItem(item);
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 min-w-0 flex-wrap">
                                                            <span
                                                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${item.status === "ready" ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                                                                    }`}
                                                            >
                                                                {prettyStatus}
                                                            </span>

                                                            {item.raw?.language && (
                                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                                                    {String(item.raw.language)}
                                                                </span>
                                                            )}

                                                            <span className="text-xs text-muted-foreground truncate">
                                                                • Categories: {item.categories || "None"}
                                                            </span>
                                                        </div>

                                                        <h3 className="font-bold text-lg leading-tight hover:text-primary transition-colors truncate">
                                                            {getHeadline()}
                                                        </h3>

                                                        <p className="text-sm text-muted-foreground line-clamp-2">{getSummary()}</p>
                                                    </div>

                                                    {item.raw?.imageUrl && (
                                                        <img
                                                            src={item.raw.imageUrl}
                                                            alt="preview"
                                                            className="w-24 h-16 object-cover rounded-md shrink-0"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-border/10 gap-3">
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground min-w-0">
                                                        <span className="flex items-center gap-1 max-w-[240px] min-w-0">
                                                            <ExternalLink className="h-3 w-3 shrink-0" />
                                                            <span className="truncate">{item.raw?.source?.name || "Unknown source"}</span>
                                                        </span>

                                                        <span className="max-w-[220px] truncate">Author: {item.raw?.author || "Original"}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedReviewItem(item);
                                                            }}
                                                            className="p-1.5 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                                                            title="View Full Details"
                                                            type="button"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(item.id, item.status === "ready" ? "pending_review" : "ready");
                                                            }}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 ${item.status === "ready"
                                                                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                                                                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                                                                }`}
                                                            type="button"
                                                        >
                                                            {item.status === "ready" ? "Revert" : "Approve"}
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(item.id, "archived");
                                                            }}
                                                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                                                            title="Archive"
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-2 pt-4">
                                            <button
                                                disabled={safePage === 1}
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                className="p-2 rounded-md hover:bg-muted disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                                                type="button"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>

                                            <span className="text-sm font-bold">
                                                Page {safePage} of {totalPages}
                                            </span>

                                            <button
                                                disabled={safePage === totalPages}
                                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                                className="p-2 rounded-md hover:bg-muted disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
                                                type="button"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {isLoadingRaw ? (
                                <div className="p-12 text-center text-muted-foreground">Loading raw items...</div>
                            ) : rawItems.length === 0 ? (
                                <div className="p-12 text-center border border-dashed rounded-xl text-muted-foreground">
                                    No raw items. Run “Sync” to pull RSS.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rawItems.map((item) => {
                                        const checked = selectedRawIds.includes(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className="p-4 rounded-xl border border-border/40 bg-card hover:border-primary/20 transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleRawSelection(item.id)}
                                                        className="mt-1"
                                                    />

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                                            <span className="font-bold">{item.source?.name || "Unknown source"}</span>
                                                            {item.publishedAt && (
                                                                <span>• {new Date(item.publishedAt).toLocaleString()}</span>
                                                            )}
                                                            {item.language && <span className="uppercase font-bold">• {String(item.language)}</span>}
                                                        </div>

                                                        <div className="font-bold text-sm mt-1 truncate">{item.title || "Untitled"}</div>
                                                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                            {item.description || ""}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground mt-2 truncate">
                                                            URL: {item.url}
                                                        </div>
                                                    </div>

                                                    {item.imageUrl && (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt="raw"
                                                            className="w-24 h-16 object-cover rounded-md shrink-0"
                                                            loading="lazy"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Right column: sources */}
                <div className="space-y-6">
                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4">
                        <h2 className="font-bold flex items-center gap-2">
                            <Rss className="h-5 w-5 text-primary" />
                            Feed Management
                        </h2>

                        <div className="space-y-3">
                            <input
                                type="text"
                                placeholder="Source Name"
                                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                                value={newSource.name}
                                onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                            />
                            <input
                                type="url"
                                placeholder="RSS URL"
                                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                                value={newSource.url}
                                onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                            />
                            <button
                                onClick={handleAddSource}
                                className="w-full px-4 py-2 rounded-md bg-foreground text-background text-sm font-bold transition-all duration-150 hover:bg-foreground/90 hover:shadow-md active:scale-[0.97] active:shadow-sm"
                                type="button"
                            >
                                Add Source
                            </button>
                        </div>

                        <div className="pt-4 space-y-3 max-h-[400px] overflow-y-auto">
                            {sources?.map((source) => (
                                <div key={source.id} className="p-3 rounded-lg border border-border/40 bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 pr-2">
                                            <p className="text-xs font-bold truncate">{source.name}</p>
                                            <p className="text-[10px] text-muted-foreground break-all">{source.feedUrl}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleSource(source.id, source.enabled)}
                                                className={`p-1 rounded-md transition-colors ${source.enabled ? "text-green-500 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted/10"
                                                    }`}
                                                type="button"
                                                title="Toggle"
                                            >
                                                <Power className="h-3 w-3" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSource(source.id)}
                                                className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                                                type="button"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-3">
                        <h3 className="font-bold text-sm">Active Pipelines</h3>
                        <div className="space-y-2">
                            {[
                                { label: "Automated Pull", status: "Active", color: "text-green-500" },
                                { label: "Processing", status: "Idle", color: "text-muted-foreground" },
                                { label: "Translation (3L)", status: "Active", color: "text-green-500" },
                            ].map((job, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">{job.label}</span>
                                    <span className={`font-bold ${job.color}`}>{job.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedReviewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="relative w-full max-w-4xl bg-card rounded-2xl shadow-2xl border border-border/40 my-8">
                        <div className="p-6 border-b border-border/40 flex items-center justify-between sticky top-0 bg-card z-10">
                            <div>
                                <h2 className="text-xl font-bold font-serif">Review & Edit Article</h2>
                                <p className="text-xs text-muted-foreground">Modify translations and categories before publishing</p>
                            </div>
                            <button
                                onClick={() => setSelectedReviewItem(null)}
                                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                                type="button"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-4 md:col-span-3">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-primary">
                                        Categories (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted/50 p-3 rounded-xl border-none text-sm font-bold"
                                        value={selectedReviewItem.categories || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, categories: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" /> English
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted/30 p-3 rounded-lg border-none text-sm font-bold"
                                        value={selectedReviewItem.headlineEn || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, headlineEn: e.target.value })}
                                    />
                                    <textarea
                                        rows={6}
                                        className="w-full bg-muted/30 p-3 rounded-lg border-none text-xs leading-relaxed"
                                        value={selectedReviewItem.summaryEn || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, summaryEn: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500" /> Russian
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted/30 p-3 rounded-lg border-none text-sm font-bold"
                                        value={selectedReviewItem.headlineRu || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, headlineRu: e.target.value })}
                                    />
                                    <textarea
                                        rows={6}
                                        className="w-full bg-muted/30 p-3 rounded-lg border-none text-xs leading-relaxed"
                                        value={selectedReviewItem.summaryRu || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, summaryRu: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-green-500" /> Uzbek
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted/30 p-3 rounded-lg border-none text-sm font-bold"
                                        value={selectedReviewItem.headlineUz || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, headlineUz: e.target.value })}
                                    />
                                    <textarea
                                        rows={6}
                                        className="w-full bg-muted/30 p-3 rounded-lg border-none text-xs leading-relaxed"
                                        value={selectedReviewItem.summaryUz || ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, summaryUz: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center justify-between">
                            <div className="text-[10px] font-bold text-muted-foreground">
                                SOURCE: {String(selectedReviewItem?.raw?.source?.name || "Unknown").toUpperCase()}
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedReviewItem(null)}
                                    className="px-6 py-2 rounded-lg text-xs font-bold hover:bg-muted transition-colors"
                                    type="button"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={() =>
                                        handleSaveDetail(selectedReviewItem.id, {
                                            headlineEn: selectedReviewItem.headlineEn,
                                            headlineRu: selectedReviewItem.headlineRu,
                                            headlineUz: selectedReviewItem.headlineUz,
                                            summaryEn: selectedReviewItem.summaryEn,
                                            summaryRu: selectedReviewItem.summaryRu,
                                            summaryUz: selectedReviewItem.summaryUz,
                                            categories: selectedReviewItem.categories,
                                        })
                                    }
                                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                                    type="button"
                                >
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}