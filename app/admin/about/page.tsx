"use client";

import { useGlobalContext } from "@/lib/context";
import { useState, useEffect } from "react";
import { Save, Loader2, Globe, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function AdminAboutPage() {
    const { aboutContent, updateAboutContent, isLoading } = useGlobalContext();
    const [activeTab, setActiveTab] = useState<"en" | "ru" | "uz">("en");
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        titleRu: "",
        titleUz: "",
        content: "",
        contentRu: "",
        contentUz: "",
        image: ""
    });

    useEffect(() => {
        if (aboutContent) {
            setFormData({
                title: aboutContent.title || "",
                titleRu: aboutContent.titleRu || "",
                titleUz: aboutContent.titleUz || "",
                content: aboutContent.content || "",
                contentRu: aboutContent.contentRu || "",
                contentUz: aboutContent.contentUz || "",
                image: aboutContent.image || ""
            });
        }
    }, [aboutContent]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateAboutContent(formData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold">About Us Management</h1>
                    <p className="text-muted-foreground">Update your university's story across all languages.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex border-b border-border/40 bg-muted/30">
                    {(['en', 'ru', 'uz'] as const).map((lang) => (
                        <button
                            key={lang}
                            onClick={() => setActiveTab(lang)}
                            className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === lang ? "text-primary bg-card" : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3" />
                                {lang === 'en' ? 'English' : lang === 'ru' ? 'Russian' : 'Uzbek'}
                            </div>
                            {activeTab === lang && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
                        </button>
                    ))}
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Main Image URL</label>
                            <div className="relative">
                                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="https://images.unsplash.com/..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    value={formData.image}
                                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                                />
                            </div>
                        </div>

                        {activeTab === "en" && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Page Title (EN)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Story / Content (EN)</label>
                                    <textarea
                                        rows={12}
                                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "ru" && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Page Title (RU)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.titleRu}
                                        onChange={(e) => setFormData({ ...formData, titleRu: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Story / Content (RU)</label>
                                    <textarea
                                        rows={12}
                                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.contentRu}
                                        onChange={(e) => setFormData({ ...formData, contentRu: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === "uz" && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Page Title (UZ)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.titleUz}
                                        onChange={(e) => setFormData({ ...formData, titleUz: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Story / Content (UZ)</label>
                                    <textarea
                                        rows={12}
                                        className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                        value={formData.contentUz}
                                        onChange={(e) => setFormData({ ...formData, contentUz: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
