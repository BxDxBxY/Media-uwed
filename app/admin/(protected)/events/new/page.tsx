"use client";

import { useGlobalContext } from "@/lib/context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Save, Loader2, Globe, MapPin, Calendar, Clock, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { parseEventImages, serializeEventImages, getEventCoverImage } from "@/lib/event-images";

const formatDisplayDate = (isoDate: string) => {
    if (!isoDate) return "";
    const [year, month, day] = isoDate.split("-").map(Number);
    if (!year || !month || !day) return "";
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatRangeTime = (startTime: string, endTime: string) => {
    if (!startTime) return "";

    const to12Hour = (time: string) => {
        const [hourRaw, minuteRaw] = time.split(":");
        const hours = Number(hourRaw);
        const minutes = Number(minuteRaw ?? "0");
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return "";

        const period = hours >= 12 ? "PM" : "AM";
        const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;
        return `${normalizedHour}:${String(minutes).padStart(2, "0")} ${period}`;
    };

    const start = to12Hour(startTime);
    if (!start) return "";
    const end = endTime ? to12Hour(endTime) : "";
    return end ? `${start} - ${end}` : start;
};

const parseDisplayDateForInput = (dateValue: string) => {
    if (!dateValue) return "";
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return "";

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const parseTimeRangeForInput = (timeValue: string) => {
    if (!timeValue) return { start: "", end: "" };
    const [startRaw, endRaw] = timeValue.split("-").map((part) => part.trim());

    const parseSingle = (raw: string) => {
        if (!raw) return "";
        const match = raw.toUpperCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
        if (!match) return "";

        let hours = Number(match[1]);
        const minutes = Number(match[2] ?? "0");
        const period = match[3];

        if (period === "AM" && hours === 12) hours = 0;
        if (period === "PM" && hours < 12) hours += 12;

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    };

    return {
        start: parseSingle(startRaw),
        end: parseSingle(endRaw || ""),
    };
};

function EventFormContent() {
    const { events, addEvent, updateEvent } = useGlobalContext();
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get("edit") || searchParams.get("id");

    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"en" | "ru" | "uz">("en");
    const [dateInput, setDateInput] = useState("");
    const [startTimeInput, setStartTimeInput] = useState("");
    const [endTimeInput, setEndTimeInput] = useState("");
    const [photoUrls, setPhotoUrls] = useState<string[]>([""]);

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
                });

                setDateInput(parseDisplayDateForInput(event.date));
                const parsedTime = parseTimeRangeForInput(event.time);
                setStartTimeInput(parsedTime.start);
                setEndTimeInput(parsedTime.end);

                const parsedPhotos = parseEventImages(event.image);
                setPhotoUrls(parsedPhotos.length > 0 ? parsedPhotos : [""]);
            }
        }
    }, [id, events]);

    useEffect(() => {
        const formattedDate = formatDisplayDate(dateInput);
        const formattedTime = formatRangeTime(startTimeInput, endTimeInput);

        setFormData((prev) => ({
            ...prev,
            date: formattedDate,
            time: formattedTime,
        }));
    }, [dateInput, startTimeInput, endTimeInput]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) return toast.error("Title is required");
        if (!dateInput) return toast.error("Date is required");
        if (!startTimeInput) return toast.error("Start time is required");
        setIsLoading(true);
        try {
            const serializedImages = serializeEventImages(photoUrls);
            const payload = {
                ...formData,
                image: serializedImages || `https://picsum.photos/seed/${formData.title}/800/600`,
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
                                <Calendar className="h-3.5 w-3.5" /> Date
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={dateInput}
                                onChange={(e) => setDateInput(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> Start Time
                            </label>
                            <input
                                type="time"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={startTimeInput}
                                onChange={(e) => setStartTimeInput(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" /> End Time (optional)
                            </label>
                            <input
                                type="time"
                                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                value={endTimeInput}
                                onChange={(e) => setEndTimeInput(e.target.value)}
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
                            <div className="flex items-center justify-between gap-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Photo URLs</label>
                                <button
                                    type="button"
                                    onClick={() => setPhotoUrls((prev) => [...prev, ""])}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                >
                                    <Plus className="h-3.5 w-3.5" /> Add photo
                                </button>
                            </div>
                            <div className="space-y-2">
                                {photoUrls.map((photoUrl, index) => (
                                    <div key={`${index}-${photoUrl}`} className="flex items-center gap-2">
                                        <input
                                            type="url"
                                            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
                                            placeholder={`https://... (Photo ${index + 1})`}
                                            value={photoUrl}
                                            onChange={(e) => {
                                                const next = [...photoUrls];
                                                next[index] = e.target.value;
                                                setPhotoUrls(next);
                                            }}
                                        />
                                        {photoUrls.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setPhotoUrls((prev) => prev.filter((_, i) => i !== index))}
                                                className="p-2 rounded-md border border-border hover:bg-muted"
                                                aria-label={`Remove photo ${index + 1}`}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
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
                            {photoUrls.some((url) => url.trim()) ? (
                                <img src={getEventCoverImage(serializeEventImages(photoUrls), formData.title || "event")} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                    <ImageIcon className="h-8 w-8" />
                                </div>
                            )}
                        </div>
                        {photoUrls.filter((url) => url.trim()).length > 1 && (
                            <p className="text-xs text-muted-foreground">{photoUrls.filter((url) => url.trim()).length} photos will be saved for this event.</p>
                        )}
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
