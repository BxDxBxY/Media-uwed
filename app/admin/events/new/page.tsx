"use client";

import { useGlobalContext } from "@/lib/context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Save, Loader2, Globe, MapPin, Calendar, Clock, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function EventFormContent() {
    const { events, addEvent, updateEvent } = useGlobalContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("edit") || searchParams.get("id");

    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"en" | "ru" | "uz">("en");

    const [formData, setFormData] = useState({
        title: "",
        titleRu: "",
        titleUz: "",
        description: "",
        descriptionRu: "",
        descriptionUz: "",
        date: "",
        time: "",
        location: "",
        locationRu: "",
        locationUz: "",
        attendees: 0,
        image: "",
    });

    useEffect(() => {
        if (id) {
            const event = events.find((e) => e.id === id);
            if (event) {
                setFormData({
                    title: event.title,
                    titleRu: event.titleRu || "",
                    titleUz: event.titleUz || "",
                    description: event.description || "",
                    descriptionRu: event.descriptionRu || "",
                    descriptionUz: event.descriptionUz || "",
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    locationRu: event.locationRu || "",
                    locationUz: event.locationUz || "",
                    attendees: event.attendees || 0,
                    image: event.image || "",
                });
            }
        }
    }, [id, events]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return toast.error("Title is required");
        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                image: formData.image || `https://picsum.photos/seed/${formData.title}/800/600`,
            };
            if (id) {
                await updateEvent(id, payload);
                toast.success("Event updated successfully");
            } else {
                await addEvent(payload);
                toast.success("Event created successfully");
            }
            router.push("/admin/events");
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const tabs: { id: "en" | "ru" | "uz"; label: string }[] = [
        { id: "en", label: "English" },
        { id: "ru", label: "Russian" },
        { id: "uz", label: "Uzbek" },
    ];

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/events"
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold font-serif">
                        {id ? "Edit Event" : "New Event"}
                    </h1>
                </div>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4" />
                    )}
                    {id ? "Update Event" : "Create Event"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex border-b border-border/40">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Globe className="inline-block h-3.5 w-3.5 mr-1.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-6 shadow-sm">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title ({activeTab.toUpperCase()})</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-md border border-input bg-background font-medium text-lg"
                                value={activeTab === "en" ? formData.title : activeTab === "ru" ? formData.titleRu : formData.titleUz}
                                onChange={(e) => {
                                    const key = activeTab === "en" ? "title" : activeTab === "ru" ? "titleRu" : "titleUz";
                                    setFormData({ ...formData, [key]: e.target.value });
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description ({activeTab.toUpperCase()})</label>
                            <textarea
                                className="w-full px-4 py-2 rounded-md border border-input bg-background min-h-[300px]"
                                placeholder="Details about the event..."
                                value={activeTab === "en" ? formData.description : activeTab === "ru" ? formData.descriptionRu : formData.descriptionUz}
                                onChange={(e) => {
                                    const key = activeTab === "en" ? "description" : activeTab === "ru" ? "descriptionRu" : "descriptionUz";
                                    setFormData({ ...formData, [key]: e.target.value });
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="p-6 rounded-xl border border-border/40 bg-card space-y-4 shadow-sm">
                        <h3 className="font-bold flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-primary" /> Logistics
                        </h3>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" /> Date (e.g., Feb 22, 2026)
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Time
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> Location ({activeTab.toUpperCase()})
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={activeTab === "en" ? formData.location : activeTab === "ru" ? formData.locationRu : formData.locationUz}
                                onChange={(e) => {
                                    const key = activeTab === "en" ? "location" : activeTab === "ru" ? "locationRu" : "locationUz";
                                    setFormData({ ...formData, [key]: e.target.value });
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image URL</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={formData.image}
                                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacity</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={formData.attendees}
                                onChange={(e) => setFormData({ ...formData, attendees: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-border/40 bg-card space-y-4">
                        <h3 className="font-semibold text-sm">Preview</h3>
                        <div className="aspect-video rounded-md bg-muted overflow-hidden relative border border-border/40">
                            {formData.image ? (
                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                    <ImageIcon className="h-8 w-8" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NewEventPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto" /><p className="mt-4 text-muted-foreground">Loading form...</p></div>}>
            <EventFormContent />
        </Suspense>
    );
}
