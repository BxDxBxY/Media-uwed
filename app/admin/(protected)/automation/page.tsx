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
    SlidersHorizontal,
    Settings2,
    Workflow,
    Image as ImageIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGlobalContext } from "@/lib/context";
type Tab = "review" | "raw";
type Lang = "en" | "ru" | "uz";
type IntegrationType = "ai" | "telegram";
type IntegrationConfig = {
    integrationType: IntegrationType;
    enabled: boolean;
    provider: string;
    channelId: string;
    sendOnPublish: boolean;
    aiSummarization: boolean;
    aiCategorization: boolean;
    translationPolicy: "full" | "summary_only" | "disabled";
    retryLimit: number;
    providerModel?: string;
    providerBaseUrl?: string;
    editorialPrompt?: string;
    hasProviderApiKey?: boolean;
    hasWebhookToken?: boolean;
    secretFingerprint?: string | null;
};
export default function AutomationPage() {
    const { sources, refreshData } = useGlobalContext();
    const [newSource, setNewSource] = useState({ name: "", url: "" });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);
    const [processedItems, setProcessedItems] = useState<any[]>([]);
    const [rawItems, setRawItems] = useState<any[]>([]);
    const [isLoadingReview, setIsLoadingReview] = useState(false);
    const [isLoadingRaw, setIsLoadingRaw] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>("review");
    const [selectedRawIds, setSelectedRawIds] = useState<string[]>([]);
    const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([]);
    const [selectedReviewItem, setSelectedReviewItem] = useState<any>(null);
    const [includeKeywords, setIncludeKeywords] = useState("");
    const [excludeKeywords, setExcludeKeywords] = useState("");
    const [aiInstructions, setAiInstructions] = useState("");
    const [aiStrictMode, setAiStrictMode] = useState(false);
    const [pipelineSettings, setPipelineSettings] = useState({
        automatedPull: true,
        processing: true,
        translation: true,
        fetchPeriodMinutes: 30,
    });
    const [showRequirements, setShowRequirements] = useState(false);
    const [showFeedManagement, setShowFeedManagement] = useState(false);
    const [showPipelineSettings, setShowPipelineSettings] = useState(true);
    const [isRetranslating, setIsRetranslating] = useState(false);
    const [isPublishingSingle, setIsPublishingSingle] = useState(false);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
    const itemsPerPage = 5;
    const [lang, setLang] = useState<Lang>("en");
    const [reviewLang, setReviewLang] = useState<Lang>("en");
    const [integrationConfigs, setIntegrationConfigs] = useState<Record<IntegrationType, IntegrationConfig>>({
        ai: {
            integrationType: "ai",
            enabled: true,
            provider: "openrouter",
            providerModel: "openai/gpt-4o-mini",
            providerBaseUrl: "https://openrouter.ai/api/v1",
            editorialPrompt: "",
            channelId: "",
            sendOnPublish: false,
            aiSummarization: true,
            aiCategorization: true,
            translationPolicy: "full",
            retryLimit: 3,
            hasProviderApiKey: false,
            hasWebhookToken: false,
            secretFingerprint: null,
        },
        telegram: {
            integrationType: "telegram",
            enabled: false,
            provider: "telegram-bot-api",
            providerModel: "",
            editorialPrompt: "",
            channelId: "",
            sendOnPublish: false,
            aiSummarization: true,
            aiCategorization: true,
            translationPolicy: "full",
            retryLimit: 3,
            hasProviderApiKey: false,
            hasWebhookToken: false,
            secretFingerprint: null,
        },
    });
    const [isSavingIntegration, setIsSavingIntegration] = useState<Record<IntegrationType, boolean>>({ ai: false, telegram: false });
    const [isSendingTelegramTest, setIsSendingTelegramTest] = useState(false);
    const [isSavingSecret, setIsSavingSecret] = useState<Record<IntegrationType, boolean>>({ ai: false, telegram: false });
    const [showIntegrationsPanel, setShowIntegrationsPanel] = useState(false);
    const [pendingSecrets, setPendingSecrets] = useState<Record<IntegrationType, { providerApiKey: string; webhookToken: string }>>({
        ai: { providerApiKey: "", webhookToken: "" },
        telegram: { providerApiKey: "", webhookToken: "" },
    });
    const previewBodyImages = useMemo(() => {
        if (!selectedReviewItem) return [] as string[];
        const base = selectedReviewItem.rawImageUrl || selectedReviewItem?.raw?.imageUrl || null;
        let detail: string[] = [];
        try {
            const rawJson = selectedReviewItem?.raw?.rawJson ? JSON.parse(selectedReviewItem.raw.rawJson) : {};
            detail = Array.isArray(rawJson?.detailImages)
                ? rawJson.detailImages.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
                : [];
        } catch {
            detail = [];
        }

        return Array.from(new Set([base, ...detail].filter(Boolean) as string[]));
    }, [selectedReviewItem]);

    const fetchReviewItems = async (withLoader: boolean = true) => {
        if (withLoader) setIsLoadingReview(true);
        try {
            const res = await fetch("/api/admin/automation/review");
            if (!res.ok) return;
            const data = await res.json();
            setProcessedItems(data.items || []);
        } catch (e) {
            console.error("Failed to fetch review items", e);
        } finally {
            if (withLoader) setIsLoadingReview(false);
        }
    };
    const loadIntegrationConfigs = async () => {
        try {
            const res = await fetch("/api/admin/integrations");
            if (!res.ok) return;
            const data = await res.json();
            const byType = (data.configs || []).reduce((acc: Partial<Record<IntegrationType, IntegrationConfig>>, item: IntegrationConfig) => {
                acc[item.integrationType] = item;
                return acc;
            }, {});
            setIntegrationConfigs((prev) => ({ ...prev, ...byType }));
        } catch (error) {
            console.error("Failed to load integration configs", error);
        }
    };
    const fetchRawItems = async () => {
        setIsLoadingRaw(true);
        try {
            const res = await fetch(`/api/admin/automation/raw`);
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
        loadIntegrationConfigs();
        loadAutomationSettings();
        refreshData();
    }, []);
    const loadAutomationSettings = async () => {
        try {
            const res = await fetch("/api/admin/automation/settings");
            if (!res.ok) return;
            const data = await res.json();
            const settings = data?.settings || {};
            setIncludeKeywords(settings.includeKeywords || "");
            setExcludeKeywords(settings.excludeKeywords || "");
            setAiInstructions(settings.aiInstructions || "");
            setAiStrictMode(Boolean(settings.aiStrictMode));
            setPipelineSettings({
                automatedPull: settings.automatedPull ?? true,
                processing: settings.processing ?? true,
                translation: settings.translation ?? true,
                fetchPeriodMinutes: settings.fetchPeriodMinutes ?? 30,
            });
        } catch {
            // ignore
        }
    };
    const saveAutomationSettings = async (next: { includeKeywords: string; excludeKeywords: string; aiInstructions: string; aiStrictMode: boolean; automatedPull: boolean; processing: boolean; translation: boolean; fetchPeriodMinutes: number; }) => {
        await fetch("/api/admin/automation/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(next),
        });
    };
    // Reset pagination when switching view
    useEffect(() => {
        setPage(1);
    }, [sortBy, processedItems.length]);
    useEffect(() => {
        if (activeTab === "review") {
            setSelectedRawIds([]);
        } else {
            setSelectedReviewIds([]);
        }
    }, [activeTab]);
    useEffect(() => {
        const timeout = setTimeout(() => {
            saveAutomationSettings({
                includeKeywords,
                excludeKeywords,
                aiInstructions,
                aiStrictMode,
                automatedPull: pipelineSettings.automatedPull,
                processing: pipelineSettings.processing,
                translation: pipelineSettings.translation,
                fetchPeriodMinutes: pipelineSettings.fetchPeriodMinutes,
            }).catch(() => null);
        }, 400);
    return () => clearTimeout(timeout);
    }, [includeKeywords, excludeKeywords, aiInstructions, aiStrictMode, pipelineSettings]);
    const handleSync = async () => {
        if (!pipelineSettings.automatedPull) return toast.warning("Automated Pull is disabled in pipeline settings");
        setIsProcessing(true);
        toast.info("Triggering news pull...");
        try {
            const res = await fetch("/api/cron/pull", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeKeywords, excludeKeywords, aiInstructions, aiStrictMode, force: true }),
            });
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
        if (!pipelineSettings.processing) return toast.warning("Processing pipeline is disabled");
        setIsProcessing(true);
        toast.info("Triggering processing...");
        try {
            const res = await fetch("/api/cron/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ includeKeywords, excludeKeywords, aiInstructions, aiStrictMode, force: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setTranslationProgress(100);
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
        if (!pipelineSettings.translation) return toast.warning("Translation pipeline is disabled");
        if (selectedRawIds.length === 0) return toast.warning("Select items to translate first");
        setIsTranslating(true);
        setTranslationProgress(0);
        toast.info(`Translating ${selectedRawIds.length} items...`);
        let processedTotal = 0;
        let failedTotal = 0;
        try {
            const ids = [...selectedRawIds];
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                console.info("[automation.translate] processing item", { id, index: i + 1, total: ids.length });
                const res = await fetch("/api/cron/process", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: [id], includeKeywords, excludeKeywords, aiInstructions, aiStrictMode, force: true }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    failedTotal += 1;
                    console.error("[automation.translate] failed item", { id, data });
                } else {
                    processedTotal += Number(data?.processedCount || 0);
                    failedTotal += Number(data?.failedCount || 0);
                }
                const percent = Math.round(((i + 1) / ids.length) * 100);
                setTranslationProgress(percent);
            }
            toast.success(`Processing complete: ${processedTotal} items processed${failedTotal ? `, ${failedTotal} failed` : ""}.`);
            setSelectedRawIds([]);
            fetchReviewItems();
            fetchRawItems();
        } catch (error) {
            console.error("[automation.translate] network error", error);
            toast.error("Network error during processing");
        } finally {
            window.setTimeout(() => setTranslationProgress(0), 600);
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
        const previous = processedItems;
        setProcessedItems((items) => items.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
        try {
            const res = await fetch("/api/admin/automation/review", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status: newStatus }),
            });
            if (res.ok) {
                toast.success(`Article ${newStatus.replaceAll("_", " ")}`);
                fetchReviewItems(false);
            } else {
                setProcessedItems(previous);
                toast.error("Failed to update status");
            }
        } catch {
            setProcessedItems(previous);
            toast.error("Failed to update status");
        }
    };
    const handleBulkReviewStatus = async (newStatus: "ready" | "archived") => {
        if (selectedReviewIds.length === 0) return toast.warning("Select review items first");
        try {
            const res = await fetch("/api/admin/automation/review", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedReviewIds, status: newStatus }),
            });
            if (res.ok) {
                toast.success(`${selectedReviewIds.length} item(s) updated`);
                setSelectedReviewIds([]);
                fetchReviewItems(false);
            } else {
                toast.error("Failed to update selected items");
            }
        } catch {
            toast.error("Failed to update selected items");
        }
    };
    const handleBulkRawDelete = async () => {
        if (selectedRawIds.length === 0) return toast.warning("Select raw items first");
        if (!confirm(`Delete ${selectedRawIds.length} selected raw item(s)?`)) return;
        try {
            const res = await fetch("/api/admin/automation/raw", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedRawIds }),
            });
            if (res.ok) {
                toast.success(`${selectedRawIds.length} raw item(s) deleted`);
                setSelectedRawIds([]);
                fetchRawItems();
            } else {
                toast.error("Failed to delete selected raw items");
            }
        } catch {
            toast.error("Failed to delete selected raw items");
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
    const handleRetranslate = async (rawId: string) => {
        if (!rawId) return toast.error("Raw article id is missing");
        setIsRetranslating(true);
        try {
            const res = await fetch("/api/cron/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [rawId], retranslate: true, includeKeywords, excludeKeywords, aiInstructions, aiStrictMode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to re-translate article");
            const preview = (data.previews || []).find((item: any) => item.rawId === rawId);
            if (!preview) {
                toast.warning(data.message || "No re-translation preview generated");
                return;
            }
            setSelectedReviewItem((prev: any) => (prev ? { ...prev, ...preview } : prev));
            setProcessedItems((items) =>
                items.map((item) => (item.rawId === rawId ? { ...item, ...preview } : item)),
            );
            toast.success("Re-translation preview generated. Click Save Changes to persist.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to re-translate article");
        } finally {
            setIsRetranslating(false);
        }
    };
    const handleRetranslateSelected = async () => {
        if (selectedReviewIds.length === 0) return toast.warning("Select review items first");
        const rawIds = processedItems
            .filter((item) => selectedReviewIds.includes(item.id))
            .map((item) => item.rawId)
            .filter(Boolean);
        if (rawIds.length === 0) return toast.warning("Selected items do not have source raw ids");
        setIsRetranslating(true);
        try {
            const res = await fetch("/api/cron/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: rawIds, retranslate: true, includeKeywords, excludeKeywords, aiInstructions, aiStrictMode }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to re-translate selected articles");
            const previews = Array.isArray(data.previews) ? data.previews : [];
            if (previews.length === 0) {
                toast.warning(data.message || "No selected items were re-translated");
                return;
            }
            const previewByRawId = new Map(previews.map((item: any) => [item.rawId, item]));
            setProcessedItems((items) => items.map((item) => {
                const preview = previewByRawId.get(item.rawId);
                return preview ? { ...item, ...preview } : item;
            }));
            if (selectedReviewItem?.rawId && previewByRawId.has(selectedReviewItem.rawId)) {
                setSelectedReviewItem((prev: any) => {
                    if (!prev) return prev;
                    const preview = previewByRawId.get(prev.rawId);
                    return preview ? { ...prev, ...preview } : prev;
                });
            }
            toast.success(`Generated ${previews.length} re-translation preview(s). Save changes to persist.`);
            setSelectedReviewIds([]);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to re-translate selected articles");
        } finally {
            setIsRetranslating(false);
        }
    };
    const handlePublishSingleReview = async (processedId: string) => {
        if (!processedId) return toast.error("Missing review item id");
        setIsPublishingSingle(true);
        try {
            const res = await fetch("/api/cron/publish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ processedIds: [processedId] }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to publish selected article");
            if ((data.publishedCount ?? 0) === 0) {
                toast.warning(data.message || "No article was published");
            } else {
                toast.success(`Article published. Telegram sent: ${data.telegramSentCount ?? 0}`);
                setSelectedReviewItem(null);
                fetchReviewItems(false);
                refreshData();
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to publish selected article");
        } finally {
            setIsPublishingSingle(false);
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
    const toggleReviewSelection = (id: string) => {
        setSelectedReviewIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };
    const selectAllReviewOnPage = () => {
        const ids = paginatedItems.map((x) => x.id).filter(Boolean);
        setSelectedReviewIds(ids);
    };
    const clearReviewSelection = () => setSelectedReviewIds([]);
    const selectAllRawOnPage = () => {
        const ids = rawItems.map((x) => x.id).filter(Boolean);
        setSelectedRawIds(ids);
    };
    const clearRawSelection = () => setSelectedRawIds([]);
    const updatePipeline = (key: "automatedPull" | "processing" | "translation") => {
        const next = { ...pipelineSettings, [key]: !pipelineSettings[key] };
        setPipelineSettings(next);
        saveAutomationSettings({
            includeKeywords,
            excludeKeywords,
            aiInstructions,
            aiStrictMode,
            automatedPull: next.automatedPull,
            processing: next.processing,
            translation: next.translation,
            fetchPeriodMinutes: next.fetchPeriodMinutes,
        }).catch(() => null);
    };
    const updateIntegration = (type: IntegrationType, patch: Partial<IntegrationConfig>) => {
        setIntegrationConfigs((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                ...patch,
            },
        }));
    };
    const saveIntegration = async (type: IntegrationType) => {
        setIsSavingIntegration((prev) => ({ ...prev, [type]: true }));
        try {
            const res = await fetch("/api/admin/integrations", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(integrationConfigs[type]),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to save integration");
            toast.success(`${type === "ai" ? "AI" : "Telegram"} integration saved`);
            loadIntegrationConfigs();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save integration");
        } finally {
            setIsSavingIntegration((prev) => ({ ...prev, [type]: false }));
        }
    };
    const saveSecret = async (type: IntegrationType) => {
        const payload = pendingSecrets[type];
        if (!payload.providerApiKey.trim() && !payload.webhookToken.trim()) {
            toast.warning("Enter a secret value first");
            return;
        }
        setIsSavingSecret((prev) => ({ ...prev, [type]: true }));
        try {
            const res = await fetch("/api/admin/integrations/secret", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ integrationType: type, ...payload }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to save secret");
            toast.success(`${type === "ai" ? "AI" : "Telegram"} secret updated securely`);
            setPendingSecrets((prev) => ({ ...prev, [type]: { providerApiKey: "", webhookToken: "" } }));
            loadIntegrationConfigs();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save secret");
        } finally {
            setIsSavingSecret((prev) => ({ ...prev, [type]: false }));
        }
    };
    const sendTelegramTest = async () => {
        setIsSendingTelegramTest(true);
        try {
            const res = await fetch("/api/admin/integrations/test-message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: "✅ Test message from automation integrations panel" }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Failed to send Telegram test");
            toast.success("Telegram test message sent");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to send Telegram test");
        } finally {
            setIsSendingTelegramTest(false);
        }
    };
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
            {isTranslating && (
                <div className="rounded-lg border border-border/40 bg-card p-3">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-muted-foreground">AI translation progress</span>
                        <span className="font-semibold">{translationProgress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500" style={{ width: `${translationProgress}%` }} />
                    </div>
                </div>
            )}
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setShowRequirements((prev) => !prev)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted">
                        <SlidersHorizontal className="h-4 w-4" /> {showRequirements ? "Hide requirements" : "Show requirements"}
                    </button>
                    <button type="button" onClick={() => setShowIntegrationsPanel((prev) => !prev)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted">
                        <Settings2 className="h-4 w-4" /> {showIntegrationsPanel ? "Hide integrations" : "Show integrations"}
                    </button>
                </div>
                {showRequirements && (
            <div className="p-4 rounded-xl border border-border/40 bg-card grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">AI prompt</label>
                    <textarea
                        rows={4}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                        placeholder="Describe what to fetch/skip, translation style, paraphrasing tone, category priorities, and output rules."
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={aiStrictMode}
                            onChange={(e) => setAiStrictMode(e.target.checked)}
                        />
                        Strict mode: process only content that matches AI prompt terms.
                    </label>
                </div>
                <p className="md:col-span-2 text-xs text-muted-foreground">
                    AI and Telegram settings are saved independently in their own integration cards.
                </p>
            </div>
                )}
            </div>
            {showIntegrationsPanel && (
            <section className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4" />Integrations</h2>
                    <span className="text-xs text-muted-foreground">Secure AI + Telegram control plane</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">AI Modules</h3>
                            <input type="checkbox" checked={integrationConfigs.ai.enabled} onChange={(e) => updateIntegration("ai", { enabled: e.target.checked })} />
                        </div>
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Provider (e.g. openrouter, lm-studio)" value={integrationConfigs.ai.provider} onChange={(e) => updateIntegration("ai", { provider: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="API Endpoint Base URL (e.g. https://openrouter.ai/api/v1)" value={integrationConfigs.ai.providerBaseUrl || ""} onChange={(e) => updateIntegration("ai", { providerBaseUrl: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Provider model (e.g. openai/gpt-4o-mini, llama3)" value={integrationConfigs.ai.providerModel || ""} onChange={(e) => updateIntegration("ai", { providerModel: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Paste AI provider API key to rotate" value={pendingSecrets.ai.providerApiKey} onChange={(e) => setPendingSecrets((prev) => ({ ...prev, ai: { ...prev.ai, providerApiKey: e.target.value } }))} />
                        <p className="text-xs text-muted-foreground">Stored encrypted. Current key: {integrationConfigs.ai.hasProviderApiKey ? `configured (${integrationConfigs.ai.secretFingerprint || "fingerprint unavailable"})` : "not configured"}</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => saveSecret("ai")} disabled={isSavingSecret.ai} className="px-3 py-2 rounded-md border border-border text-sm font-semibold disabled:opacity-60">{isSavingSecret.ai ? "Saving..." : "Rotate AI key"}</button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Rotate AI key = securely replaces stored provider API key only. It does not change Telegram settings.</p>
                        <label className="flex items-center justify-between text-sm"><span>Summarization</span><input type="checkbox" checked={integrationConfigs.ai.aiSummarization} onChange={(e) => updateIntegration("ai", { aiSummarization: e.target.checked })} /></label>
                        <label className="flex items-center justify-between text-sm"><span>Categorization</span><input type="checkbox" checked={integrationConfigs.ai.aiCategorization} onChange={(e) => updateIntegration("ai", { aiCategorization: e.target.checked })} /></label>
                        <textarea className="w-full min-h-24 px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="AI editorial prompt: translation/paraphrasing instructions" value={integrationConfigs.ai.editorialPrompt || ""} onChange={(e) => updateIntegration("ai", { editorialPrompt: e.target.value })} />
                        <select className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" value={integrationConfigs.ai.translationPolicy} onChange={(e) => updateIntegration("ai", { translationPolicy: e.target.value as IntegrationConfig["translationPolicy"] })}>
                            <option value="full">Full translation</option>
                            <option value="summary_only">Summary-only translation</option>
                            <option value="disabled">Translation disabled</option>
                        </select>
                        <button type="button" onClick={() => saveIntegration("ai")} disabled={isSavingIntegration.ai} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">{isSavingIntegration.ai ? "Saving..." : "Save AI config"}</button>
                    </div>
                    <div className="rounded-lg border border-border/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Telegram Connector</h3>
                            <input type="checkbox" checked={integrationConfigs.telegram.enabled} onChange={(e) => updateIntegration("telegram", { enabled: e.target.checked })} />
                        </div>
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Provider" value={integrationConfigs.telegram.provider} onChange={(e) => updateIntegration("telegram", { provider: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Paste Telegram bot token to rotate" value={pendingSecrets.telegram.providerApiKey} onChange={(e) => setPendingSecrets((prev) => ({ ...prev, telegram: { ...prev.telegram, providerApiKey: e.target.value } }))} />
                        <p className="text-xs text-muted-foreground">Bot token: {integrationConfigs.telegram.hasProviderApiKey ? `configured (${integrationConfigs.telegram.secretFingerprint || "fingerprint unavailable"})` : "not configured"}</p>
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Channel/chat ID" value={integrationConfigs.telegram.channelId} onChange={(e) => updateIntegration("telegram", { channelId: e.target.value })} />
                        <input className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm" placeholder="Webhook token (optional)" value={pendingSecrets.telegram.webhookToken} onChange={(e) => setPendingSecrets((prev) => ({ ...prev, telegram: { ...prev.telegram, webhookToken: e.target.value } }))} />
                        <label className="flex items-center justify-between text-sm"><span>Send selected/published news to Telegram</span><input type="checkbox" checked={integrationConfigs.telegram.sendOnPublish} onChange={(e) => updateIntegration("telegram", { sendOnPublish: e.target.checked })} /></label>
                        <button type="button" onClick={() => saveSecret("telegram")} disabled={isSavingSecret.telegram} className="px-3 py-2 rounded-md border border-border text-sm font-semibold disabled:opacity-60">{isSavingSecret.telegram ? "Saving..." : "Rotate Telegram secrets"}</button>
                        <button type="button" onClick={() => saveIntegration("telegram")} disabled={isSavingIntegration.telegram} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">{isSavingIntegration.telegram ? "Saving..." : "Save Telegram config"}</button>
                        <button type="button" onClick={sendTelegramTest} disabled={isSendingTelegramTest} className="px-3 py-2 rounded-md border border-border text-sm font-semibold disabled:opacity-60">{isSendingTelegramTest ? "Sending..." : "Send test message"}</button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground">Secrets are encrypted server-side and never returned in plaintext to the browser.</p>
            </section>
            )}
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
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                <select
                                    className="bg-muted text-xs font-bold px-2 py-1 rounded-md outline-none"
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                </select>
                                <button
                                    onClick={selectAllReviewOnPage}
                                    className="px-3 py-1.5 rounded-md bg-muted text-xs font-bold hover:bg-muted/80"
                                    type="button"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={clearReviewSelection}
                                    className="px-3 py-1.5 rounded-md bg-muted text-xs font-bold hover:bg-muted/80"
                                    type="button"
                                >
                                    Clear
                                </button>
                                <button
                                    disabled={selectedReviewIds.length === 0}
                                    onClick={() => handleBulkReviewStatus("ready")}
                                    className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                    type="button"
                                >
                                    Approve Selected ({selectedReviewIds.length})
                                </button>
                                <button
                                    disabled={selectedReviewIds.length === 0 || isRetranslating}
                                    onClick={handleRetranslateSelected}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                                    type="button"
                                >
                                    {isRetranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                                    Re-translate Selected
                                </button>
                                <button
                                    disabled={selectedReviewIds.length === 0}
                                    onClick={() => handleBulkReviewStatus("archived")}
                                    className="px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 disabled:opacity-50"
                                    type="button"
                                >
                                    Delete Selected
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 flex-wrap justify-end">
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
                                <button
                                    disabled={selectedRawIds.length === 0}
                                    onClick={handleBulkRawDelete}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-xs font-bold hover:bg-destructive/90 disabled:opacity-50"
                                    type="button"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    Delete Selected
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
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedReviewIds.includes(item.id)}
                                                            onChange={(e) => {
                                                                e.stopPropagation();
                                                                toggleReviewSelection(item.id);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mt-1"
                                                        />
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
                                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                                {getSummary()}
                                                            </p>
                                                            <div className="flex items-center justify-between pt-2 border-t border-border/10 gap-3">
                                                                <div className="flex items-center gap-4 text-xs text-muted-foreground min-w-0">
                                                                    <span className="flex items-center gap-1 max-w-[240px] min-w-0">
                                                                        <ExternalLink className="h-3 w-3 shrink-0" />
                                                                        <span className="truncate">{item.raw?.source?.name || "Unknown source"}</span>
                                                                    </span>
                                                                    <span className="max-w-[220px] truncate">Author: {item.raw?.author || "Original"}</span>
                                                                </div>
                                                            </div>
                                                        </div>
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
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold flex items-center gap-2">
                                <Rss className="h-5 w-5 text-primary" />
                                Feed Management
                            </h2>
                            <button type="button" onClick={() => setShowFeedManagement((prev) => !prev)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted inline-flex items-center gap-1">
                                <Settings2 className="h-3 w-3" /> {showFeedManagement ? "Hide" : "Show"}
                            </button>
                        </div>
                        {showFeedManagement && (
                        <>
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
                        </>
                        )}
                    </div>
                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm">Active Pipelines</h3>
                            <button type="button" onClick={() => setShowPipelineSettings((prev) => !prev)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted inline-flex items-center gap-1">
                                <Workflow className="h-3 w-3" /> {showPipelineSettings ? "Hide" : "Show"}
                            </button>
                        </div>
                        {showPipelineSettings && (
                        <div className="space-y-2">
                            {[
                                {
                                    key: "automatedPull" as const,
                                    label: "Automated Pull",
                                    status: pipelineSettings.automatedPull ? "Enabled" : "Disabled",
                                    color: pipelineSettings.automatedPull ? "text-green-500" : "text-muted-foreground",
                                },
                                {
                                    key: "processing" as const,
                                    label: "Processing",
                                    status: !pipelineSettings.processing ? "Disabled" : isProcessing ? "Running" : "Enabled",
                                    color: !pipelineSettings.processing ? "text-muted-foreground" : isProcessing ? "text-blue-500" : "text-green-500",
                                },
                                {
                                    key: "translation" as const,
                                    label: "Translation (3L)",
                                    status: !pipelineSettings.translation ? "Disabled" : isTranslating ? "Running" : "Enabled",
                                    color: !pipelineSettings.translation ? "text-muted-foreground" : isTranslating ? "text-blue-500" : "text-green-500",
                                },
                            ].map((job) => (
                                <div key={job.key} className="flex items-center justify-between text-xs gap-3">
                                    <span className="text-muted-foreground">{job.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold ${job.color}`}>{job.status}</span>
                                        <button
                                            type="button"
                                            onClick={() => updatePipeline(job.key)}
                                            className={`h-5 w-9 rounded-full transition-colors relative ${pipelineSettings[job.key] ? "bg-primary" : "bg-muted"}`}
                                            aria-label={`Toggle ${job.label}`}
                                        >
                                            <span
                                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${pipelineSettings[job.key] ? "left-4" : "left-0.5"}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-border/40 space-y-1">
                                <label className="text-[11px] text-muted-foreground">Auto-fetch period (minutes)</label>
                                <input
                                    type="number"
                                    min={5}
                                    max={1440}
                                    value={pipelineSettings.fetchPeriodMinutes}
                                    onChange={(e) => {
                                        const minutes = Math.min(1440, Math.max(5, Number(e.target.value) || 30));
                                        const next = { ...pipelineSettings, fetchPeriodMinutes: minutes };
                                        setPipelineSettings(next);
                                        saveAutomationSettings({
                                            includeKeywords,
                                            excludeKeywords,
                                            aiInstructions,
                                            aiStrictMode,
                                            automatedPull: next.automatedPull,
                                            processing: next.processing,
                                            translation: next.translation,
                                            fetchPeriodMinutes: next.fetchPeriodMinutes,
                                        }).catch(() => null);
                                    }}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                <p className="text-[11px] text-muted-foreground">Used by /api/cron/automation to run pull/process in background cadence.</p>
                            </div>
                        </div>
                        )}
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
                            <div className="space-y-6">
                                <div className="space-y-4">
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
                                <div className="space-y-3">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-primary inline-flex items-center gap-2">
                                        <ImageIcon className="h-3 w-3" /> Preview image URL
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-muted/50 p-3 rounded-xl border-none text-xs"
                                        value={selectedReviewItem.rawImageUrl ?? selectedReviewItem?.raw?.imageUrl ?? ""}
                                        onChange={(e) => setSelectedReviewItem({ ...selectedReviewItem, rawImageUrl: e.target.value })}
                                        placeholder="https://..."
                                    />
                                    {(selectedReviewItem.rawImageUrl || selectedReviewItem?.raw?.imageUrl) && (
                                        <div className="rounded-xl overflow-hidden border border-border/40">
                                            <img src={selectedReviewItem.rawImageUrl || selectedReviewItem?.raw?.imageUrl} alt="Article" className="w-full max-h-72 object-cover" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        {(["en", "ru", "uz"] as Lang[]).map((l) => (
                                            <button
                                                key={`review-${l}`}
                                                type="button"
                                                onClick={() => setReviewLang(l)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold ${reviewLang === l ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                                            >
                                                {l.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground">Public preview mode</span>
                                </div>
                                <div className="rounded-xl border border-border/40 bg-background overflow-hidden">
                                    <div className="p-5 border-b border-border/40 space-y-3">
                                        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">{reviewLang.toUpperCase()} headline</p>
                                        <input
                                            type="text"
                                            className="w-full bg-muted/40 p-3 rounded-lg border-none text-base font-bold"
                                            value={reviewLang === "en" ? (selectedReviewItem.headlineEn || "") : reviewLang === "ru" ? (selectedReviewItem.headlineRu || "") : (selectedReviewItem.headlineUz || "")}
                                            onChange={(e) => setSelectedReviewItem({
                                                ...selectedReviewItem,
                                                ...(reviewLang === "en" ? { headlineEn: e.target.value } : reviewLang === "ru" ? { headlineRu: e.target.value } : { headlineUz: e.target.value }),
                                            })}
                                        />
                                        <textarea
                                            rows={5}
                                            className="w-full bg-muted/30 p-3 rounded-lg border-none text-sm leading-relaxed"
                                            value={reviewLang === "en" ? (selectedReviewItem.summaryEn || "") : reviewLang === "ru" ? (selectedReviewItem.summaryRu || "") : (selectedReviewItem.summaryUz || "")}
                                            onChange={(e) => setSelectedReviewItem({
                                                ...selectedReviewItem,
                                                ...(reviewLang === "en" ? { summaryEn: e.target.value } : reviewLang === "ru" ? { summaryRu: e.target.value } : { summaryUz: e.target.value }),
                                            })}
                                        />
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Public article preview</p>
                                        <div className="space-y-4 rounded-lg border border-border/40 bg-card p-4">
                                            <h3 className="text-xl font-serif font-bold leading-tight">
                                                {reviewLang === "en" ? (selectedReviewItem.headlineEn || "") : reviewLang === "ru" ? (selectedReviewItem.headlineRu || "") : (selectedReviewItem.headlineUz || "")}
                                            </h3>
                                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                                                {reviewLang === "en" ? (selectedReviewItem.summaryEn || "") : reviewLang === "ru" ? (selectedReviewItem.summaryRu || "") : (selectedReviewItem.summaryUz || "")}
                                            </p>
                                            {previewBodyImages[0] && <img src={previewBodyImages[0]} alt="Lead" className="w-full max-h-80 object-cover rounded-lg" />}
                                            {(String(reviewLang === "en" ? (selectedReviewItem.contentEn || "") : reviewLang === "ru" ? (selectedReviewItem.contentRu || "") : (selectedReviewItem.contentUz || ""))
                                                .split(/\n\s*\n/)
                                                .map((x) => x.trim())
                                                .filter(Boolean)
                                            ).map((block, idx) => (
                                                <div key={`preview-block-${idx}`} className="space-y-3">
                                                    <p className="text-sm leading-7 whitespace-pre-line">{block}</p>
                                                    {previewBodyImages[idx + 1] && <img src={previewBodyImages[idx + 1]} alt={`Inline ${idx + 1}`} className="w-full max-h-72 object-cover rounded-lg" />}
                                                </div>
                                            ))}
                                        </div>
                                        <textarea
                                            rows={10}
                                            className="w-full bg-muted/20 p-4 rounded-lg border-none text-sm leading-7"
                                            value={reviewLang === "en" ? (selectedReviewItem.contentEn || "") : reviewLang === "ru" ? (selectedReviewItem.contentRu || "") : (selectedReviewItem.contentUz || "")}
                                            onChange={(e) => setSelectedReviewItem({
                                                ...selectedReviewItem,
                                                ...(reviewLang === "en" ? { contentEn: e.target.value } : reviewLang === "ru" ? { contentRu: e.target.value } : { contentUz: e.target.value }),
                                            })}
                                            placeholder={`Detailed content (${reviewLang.toUpperCase()})`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center justify-between">
                            <div className="text-[10px] font-bold text-muted-foreground space-y-1">
                                <div>SOURCE: {String(selectedReviewItem?.raw?.source?.name || "Unknown").toUpperCase()}</div>
                                {selectedReviewItem?.raw?.url && (
                                    <a
                                        href={selectedReviewItem.raw.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                    >
                                        Open original article <ExternalLink className="h-3 w-3" />
                                    </a>
                                )}
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
                                    onClick={() => handleRetranslate(selectedReviewItem.rawId)}
                                    disabled={isRetranslating}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                                    type="button"
                                >
                                    {isRetranslating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                                    Re-translate
                                </button>
                                <button
                                    onClick={() => handlePublishSingleReview(selectedReviewItem.id)}
                                    disabled={isPublishingSingle}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                                    type="button"
                                >
                                    {isPublishingSingle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                                    Publish this article
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
                                            contentEn: selectedReviewItem.contentEn,
                                            contentRu: selectedReviewItem.contentRu,
                                            contentUz: selectedReviewItem.contentUz,
                                            categories: selectedReviewItem.categories,
                                            rawImageUrl: selectedReviewItem.rawImageUrl,
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
