"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import type { AboutPageConfig } from "@/lib/about-page-config";

// Types
export interface Article {
    id: string;
    title: string;
    titleRu?: string | null;
    titleUz?: string | null;
    summary: string;
    summaryRu?: string | null;
    summaryUz?: string | null;
    content: string;
    contentRu?: string | null;
    contentUz?: string | null;
    image: string;
    imageCaption?: string | null;
    imageCaptionRu?: string | null;
    imageCaptionUz?: string | null;
    category: string;
    categories?: { id: string; name: string }[];
    date: string;
    slug: string;
    author: string;
    createdAt?: string;
}

export interface Event {
    id: string;
    title: string;
    titleRu?: string | null;
    titleUz?: string | null;
    description: string | null;
    descriptionRu?: string | null;
    descriptionUz?: string | null;
    date: string;
    time: string;
    location: string;
    locationRu?: string | null;
    locationUz?: string | null;
    attendees: number | null;
    image: string | null;
    createdAt?: string;
}

export interface Media {
    id: string;
    type: "image" | "video";
    title: string;
    titleRu?: string | null;
    titleUz?: string | null;
    url: string;
    thumbnail?: string | null;
    duration?: string | null;
    count?: string | null;
    category?: string | null;
    createdAt?: string;
}

export interface Subscriber {
    id: string;
    email: string;
    createdAt?: string;
}

export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    readAt?: string | null;
    archivedAt?: string | null;
    createdAt?: string;
}

export interface AboutContent {
    id: string;
    title: string;
    titleRu?: string | null;
    titleUz?: string | null;
    content: string;
    contentRu?: string | null;
    contentUz?: string | null;
    image?: string | null;
    updatedAt?: string;
}

export interface AnalyticsStats {
    totalVisits: number;
    totalArticleViews: number;
    popularArticles: { id: string, title: string, views: number }[];
}

export interface Source {
    id: string;
    name: string;
    feedUrl: string;
    category?: string | null;
    enabled: boolean;
    lastFetchedAt?: string | null;
    createdAt?: string;
}

export type Language = "en" | "uz" | "ru";

interface GlobalContextType {
    articles: Article[];
    events: Event[];
    media: Media[];
    subscribers: Subscriber[];
    messages: ContactMessage[];
    aboutContent: AboutContent | null;
    aboutConfig: AboutPageConfig | null;
    analytics: AnalyticsStats;
    sources: Source[];
    language: Language;
    searchQuery: string;
    isLoading: boolean;
    setSearchQuery: (query: string) => void;
    setLanguage: (lang: Language) => void;
    // Articles
    addArticle: (article: Partial<Article>) => Promise<void>;
    updateArticle: (id: string, article: Partial<Article>) => Promise<void>;
    deleteArticle: (id: string) => Promise<void>;
    // Events
    addEvent: (event: Partial<Event>) => Promise<void>;
    updateEvent: (id: string, event: Partial<Event>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    // Media
    addMedia: (media: Partial<Media>) => Promise<void>;
    updateMedia: (id: string, media: Partial<Media>) => Promise<void>;
    deleteMedia: (id: string) => Promise<void>;
    // Subscribers & Messages
    addSubscriber: (email: string) => Promise<void>;
    deleteSubscriber: (id: string) => Promise<void>;
    addMessage: (message: Omit<ContactMessage, 'id' | 'createdAt'>) => Promise<void>;
    deleteMessage: (id: string) => Promise<void>;
    // About
    updateAboutContent: (payload: { about: Partial<AboutContent>; config?: AboutPageConfig }) => Promise<void>;
    // Utility
    refreshData: () => Promise<void>;
    clearAllData: () => Promise<void>;
    recordVisit: () => Promise<void>;
    recordArticleView: (articleId: string) => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [media, setMedia] = useState<Media[]>([]);
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [aboutContent, setAboutContent] = useState<AboutContent | null>(null);
    const [aboutConfig, setAboutConfig] = useState<AboutPageConfig | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsStats>({ totalVisits: 0, totalArticleViews: 0, popularArticles: [] });
    const [language, setLanguage] = useState<Language>("en");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin') ?? false;

    const [sources, setSources] = useState<Source[]>([]);

    const refreshData = async (showLoader = false, includeAdminData = isAdminRoute) => {
        if (showLoader) setIsLoading(true);
        try {
            const [artRes, eveRes, medRes, abtRes] = await Promise.all([
                fetch(`/api/frontend/articles?page=1&limit=${includeAdminData ? 100 : 24}${includeAdminData ? '&full=1' : ''}`),
                fetch('/api/frontend/events'),
                fetch('/api/frontend/media'),
                fetch('/api/frontend/about'),
            ]);

            const artData = artRes.ok ? await artRes.json() : { articles: [] };
            const eveData = eveRes.ok ? await eveRes.json() : { events: [] };
            const medData = medRes.ok ? await medRes.json() : { media: [] };
            const abtData = abtRes.ok ? await abtRes.json() : { about: null, config: null };

            setArticles(artData.articles || []);
            setEvents(eveData.events || []);
            setMedia(medData.media || []);
            setAboutContent(abtData.about || null);
            setAboutConfig(abtData.config || null);

            if (includeAdminData) {
                const [subRes, msgRes, statsRes, srcRes] = await Promise.all([
                    fetch('/api/admin/subscribers'),
                    fetch('/api/admin/messages'),
                    fetch('/api/admin/stats'),
                    fetch('/api/admin/sources'),
                ]);

                const subData = subRes.ok ? await subRes.json() : { subscribers: [] };
                const msgData = msgRes.ok ? await msgRes.json() : { messages: [] };
                const statsData = statsRes.ok ? await statsRes.json() : { totalVisits: 0, totalArticleViews: 0, popularArticles: [] };
                const srcData = srcRes.ok ? await srcRes.json() : { sources: [] };

                setSubscribers(subData.subscribers || []);
                setMessages(msgData.messages || []);
                setAnalytics(statsData || { totalVisits: 0, totalArticleViews: 0, popularArticles: [] });
                setSources(srcData.sources || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            if (showLoader) setIsLoading(false);
        }
    };

    const recordVisit = async () => {
        try {
            await fetch('/api/admin/stats/visit', { method: 'POST' });
        } catch (e) { }
    };

    const recordArticleView = async (articleId: string) => {
        try {
            await fetch('/api/frontend/articles/view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleId, visitorIdentifier: 'anonymous' })
            });
        } catch (error) {
            console.error("Failed to record view:", error);
        }
    };

    useEffect(() => {
        refreshData(true, false);
        recordVisit();

        const storedLang = localStorage.getItem('language') as Language;
        if (storedLang && ["en", "uz", "ru"].includes(storedLang)) {
            setLanguage(storedLang);
        }
    }, []);

    useEffect(() => {
        if (isAdminRoute) {
            refreshData(true, true);
        }
    }, [isAdminRoute]);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    // Articles
    const addArticle = async (articleData: Partial<Article>) => {
        try {
            const res = await fetch('/api/frontend/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articleData)
            });

            if (!res.ok) throw new Error('Failed to create article');
            await refreshData();
            toast.success("Article created successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Error creating article");
        }
    };

    const updateArticle = async (id: string, articleData: Partial<Article>) => {
        try {
            const res = await fetch(`/api/frontend/articles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articleData)
            });
            if (!res.ok) throw new Error('Failed to update article');
            await refreshData();
            toast.success("Article updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Error updating article");
        }
    };

    const deleteArticle = async (id: string) => {
        try {
            const res = await fetch(`/api/frontend/articles/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete article');
            await refreshData();
            toast.success("Article deleted");
        } catch (error) {
            console.error(error);
            toast.error("Error deleting article");
        }
    };

    // Events
    const addEvent = async (eventData: Partial<Event>) => {
        try {
            const res = await fetch('/api/frontend/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            if (!res.ok) throw new Error('Failed to create event');
            await refreshData();
            toast.success("Event created successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Error creating event");
        }
    };

    const updateEvent = async (id: string, eventData: Partial<Event>) => {
        try {
            const res = await fetch(`/api/frontend/events/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            if (!res.ok) throw new Error('Failed to update event');
            await refreshData();
            toast.success("Event updated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Error updating event");
        }
    };

    const deleteEvent = async (id: string) => {
        try {
            const res = await fetch(`/api/frontend/events/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete event');
            await refreshData();
            toast.success("Event deleted");
        } catch (error) {
            console.error(error);
            toast.error("Error deleting event");
        }
    };

    // Media
    const addMedia = async (mediaData: Partial<Media>) => {
        try {
            const res = await fetch('/api/frontend/media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mediaData)
            });
            if (!res.ok) throw new Error('Failed to add media');
            await refreshData();
            toast.success("Media added!");
        } catch (error) {
            console.error(error);
            toast.error("Error adding media");
        }
    };

    const updateMedia = async (id: string, mediaData: Partial<Media>) => {
        try {
            const res = await fetch(`/api/frontend/media/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mediaData)
            });
            if (!res.ok) throw new Error('Failed to update media');
            await refreshData();
            toast.success("Media updated!");
        } catch (error) {
            console.error(error);
            toast.error("Error updating media");
        }
    };

    const deleteMedia = async (id: string) => {
        try {
            const res = await fetch(`/api/frontend/media/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete media');
            await refreshData();
            toast.success("Media deleted");
        } catch (error) {
            console.error(error);
            toast.error("Error deleting media");
        }
    };

    // Subscribers & Messages
    const addSubscriber = async (email: string) => {
        try {
            const normalizedEmail = email.trim().toLowerCase();
            const res = await fetch('/api/frontend/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: normalizedEmail })
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.error || 'Failed to subscribe');

            setSubscribers((prev) => {
                if (prev.some((s) => s.email.toLowerCase() === normalizedEmail)) return prev;
                return [{ id: body.subscriber?.id || `temp-${Date.now()}`, email: normalizedEmail, createdAt: body.subscriber?.createdAt || new Date().toISOString() }, ...prev];
            });
            toast.success("Subscribed successfully!");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Problem subscribing");
        }
    };

    const deleteSubscriber = async (id: string) => {
        const previous = subscribers;
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
        try {
            const res = await fetch(`/api/admin/subscribers/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete subscriber');
            toast.success("Subscriber removed");
        } catch (error) {
            console.error(error);
            setSubscribers(previous);
            toast.error("Error removing subscriber");
        }
    };

    const addMessage = async (messageData: Omit<ContactMessage, 'id' | 'createdAt'>) => {
        try {
            const res = await fetch('/api/frontend/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(messageData)
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(body?.error || 'Failed to send message');
            }

            toast.success("Message sent! We'll get back to you soon.");
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Error sending message");
            throw error;
        }
    };

    const deleteMessage = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete message');
            await refreshData();
            toast.success("Message deleted");
        } catch (error) {
            console.error(error);
            toast.error("Error deleting message");
        }
    };

    // About
    const updateAboutContent = async (payload: { about: Partial<AboutContent>; config?: AboutPageConfig }) => {
        try {
            const res = await fetch('/api/admin/about', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payload.about, config: payload.config })
            });
            if (!res.ok) throw new Error('Failed to update About content');
            await refreshData();
            toast.success("About Us content updated!");
        } catch (error) {
            console.error(error);
            toast.error("Error updating About content");
        }
    };

    const clearAllData = async () => {
        if (confirm('Are you sure you want to clear ALL data?')) {
            toast.info("Clearing data not fully implemented via context.");
        }
    };

    return (
        <GlobalContext.Provider
            value={{
                articles,
                events,
                media,
                subscribers,
                messages,
                aboutContent,
                aboutConfig,
                analytics,
                sources,
                language,
                searchQuery,
                isLoading,
                setSearchQuery,
                setLanguage,
                addArticle,
                updateArticle,
                deleteArticle,
                addEvent,
                updateEvent,
                deleteEvent,
                addMedia,
                updateMedia,
                deleteMedia,
                addSubscriber,
                deleteSubscriber,
                addMessage,
                deleteMessage,
                updateAboutContent,
                refreshData,
                clearAllData,
                recordVisit,
                recordArticleView,
            }}
        >
            {children}
        </GlobalContext.Provider>
    );
}

export function useGlobalContext() {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error("useGlobalContext must be used within a GlobalProvider");
    }
    return context;
}
