"use client";

import Link from "next/link";
import { PlusCircle, Search, Calendar, MapPin, Users, Edit, Trash2 } from "lucide-react";
import { useGlobalContext } from "@/lib/context";
import { getEventCoverImage } from "@/lib/event-images";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminEventsPage() {
    const { events, deleteEvent } = useGlobalContext();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = (id: string, title: string) => {
        if (confirm(`Are you sure you want to delete "${title}"?`)) {
            deleteEvent(id);
            toast.success("Event deleted successfully!");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold font-serif">Events</h1>
                <Link href="/admin/events/new" className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors">
                    <PlusCircle className="h-4 w-4" />
                    New Event
                </Link>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border border-border/40 bg-card">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search events..."
                        className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map((event) => (
                    <div key={event.id} className="rounded-xl border border-border/40 bg-card overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-muted relative">
                            <img
                                src={getEventCoverImage(event.image, event.title)}
                                alt={event.title}
                                className="object-cover w-full h-full"
                            />
                            <div className="absolute top-3 right-3 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
                                {event.date}
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <h3 className="font-bold text-lg leading-tight">{event.title}</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span>{event.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{event.location}</span>
                                </div>
                                {event.attendees && (
                                    <div className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5" />
                                        <span>{event.attendees} attendees</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                <Link
                                    href={`/admin/events/new?edit=${event.id}`}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium transition-colors"
                                >
                                    <Edit className="h-3.5 w-3.5" />
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(event.id, event.title)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-sm font-medium transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredEvents.length === 0 && (
                    <div className="col-span-full p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No events found</p>
                        <p className="text-sm mt-1">Create your first event to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}
