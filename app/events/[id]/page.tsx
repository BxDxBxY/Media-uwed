"use client";

import { useGlobalContext } from "@/lib/context";
import { Calendar, MapPin, Clock, Users, ArrowLeft, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";
import { parseEventImages } from "@/lib/event-images";

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { events, isLoading } = useGlobalContext();
    const { id } = use(params);

    const event = events.find((e) => e.id === id);

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-32 text-center">
                <div className="inline-block w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
            </div>
        );
    }

    if (!event) {
        notFound();
    }

    const eventImages = parseEventImages(event.image);
    const coverImage = eventImages[0] || `https://picsum.photos/seed/${event.title}/1200/800`;

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Event link copied!");
    };

    return (
        <div className="min-h-screen pb-20">
            {/* Event Header with Image */}
            <div className="relative h-[40vh] md:h-[50vh] bg-slate-900">
                <img src={coverImage} alt={event.title} className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 container mx-auto px-4 pb-12">
                    <Link href="/events" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
                    </Link>
                    <h1 className="text-3xl md:text-6xl font-serif font-bold text-white max-w-4xl leading-tight">
                        {event.title}
                    </h1>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8">
                    <div className="prose prose-lg dark:prose-invert max-w-none">
                        <p className="lead text-xl text-muted-foreground mb-8">
                            {event.description}
                        </p>
                        <div className="h-px bg-border/40 my-8" />
                        <h3>Event Details</h3>
                        <p>
                            Join us for this exciting event at the university campus. Please ensure you arrive at least 15 minutes early for registration.
                        </p>
                    </div>

                    {eventImages.length > 1 && (
                        <div className="mt-10">
                            <h3 className="text-xl font-serif font-bold mb-4">Event Photos</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {eventImages.map((imageUrl, index) => (
                                    <div key={imageUrl + index} className="aspect-[4/3] rounded-xl overflow-hidden border border-border/40">
                                        <img src={imageUrl} alt={`${event.title} photo ${index + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-12 flex gap-4">
                        <button
                            onClick={() => toast.success("You are successfully registered for this event!")}
                            className="bg-primary text-primary-foreground px-8 py-3 rounded-full font-bold hover:opacity-90 transition-all flex-1 md:flex-none text-center"
                        >
                            Register Now
                        </button>
                        <button
                            onClick={handleShare}
                            className="p-3 rounded-full border border-border hover:bg-muted transition-colors"
                        >
                            <Share2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="sticky top-24 space-y-6">
                        <div className="p-6 rounded-2xl border border-border/40 bg-card overflow-hidden">
                            <h4 className="font-bold flex items-center gap-2 mb-6 text-lg">
                                <Calendar className="h-5 w-5 text-primary" /> Logistics
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-medium">Date</p>
                                        <p className="text-sm text-muted-foreground">{event.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-medium">Time</p>
                                        <p className="text-sm text-muted-foreground">{event.time || "To be announced"}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                                    <div>
                                        <p className="font-medium">Location</p>
                                        <p className="text-sm text-muted-foreground">{event.location}</p>
                                    </div>
                                </div>
                                {event.attendees && (
                                    <div className="flex items-start gap-3">
                                        <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                            <p className="font-medium">Capacity</p>
                                            <p className="text-sm text-muted-foreground">{event.attendees} registered</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-primary text-primary-foreground">
                            <h4 className="font-bold mb-2">Need Help?</h4>
                            <p className="text-sm text-primary-foreground/80 mb-4">
                                If you have questions about this event, please contact our support team.
                            </p>
                            <Link href="/contact" className="text-sm font-bold underline">
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
