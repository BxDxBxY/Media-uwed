"use client";

import { useGlobalContext } from "@/lib/context";
import { parseEventTimestamp } from "@/lib/event-datetime";
import { Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function EventsPage() {
  const { events, isLoading, language } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = Date.now();
    const parsedEvents = events.map((event) => ({
      event,
      eventTimestamp: parseEventTimestamp({
        date: event.date,
        time: event.time,
        startsAt: event.startsAt,
      }),
    }));

    const upcoming = parsedEvents
      .filter(({ eventTimestamp }) => eventTimestamp !== null && eventTimestamp >= now)
      .sort((a, b) => (a.eventTimestamp as number) - (b.eventTimestamp as number))
      .map(({ event }) => event);

    const past = parsedEvents
      .filter(({ eventTimestamp }) => eventTimestamp !== null && eventTimestamp < now)
      .sort((a, b) => (b.eventTimestamp as number) - (a.eventTimestamp as number))
      .map(({ event }) => event);

    return { upcomingEvents: upcoming, pastEvents: past };
  }, [events]);

  useEffect(() => {
    if (upcomingEvents.length === 0 && pastEvents.length > 0) {
      setActiveTab("past");
      return;
    }

    if (upcomingEvents.length > 0 && activeTab === "past") {
      setActiveTab("upcoming");
    }
  }, [activeTab, pastEvents.length, upcomingEvents.length]);

  const visibleEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  const getLocalized = (event: any, key: string) => {
    if (language === "ru") {
      const ruVal = event[key + "Ru"];
      if (ruVal) return ruVal;
    }
    if (language === "uz") {
      const uzVal = event[key + "Uz"];
      if (uzVal) return uzVal;
    }
    return event[key];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground font-serif italic tracking-wide">Synchronizing calendar...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <header className="max-w-4xl mb-16">
        <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">University Events</h1>
        <p className="text-xl text-muted-foreground font-serif italic">
          Join us for guest lectures, workshops, campus festivals, and networking opportunities.
        </p>
      </header>

      <div className="flex border-b border-border/40 mb-10">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === "upcoming" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Upcoming
          {activeTab === "upcoming" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`px-8 py-4 text-sm font-bold uppercase tracking-widest transition-all relative ${activeTab === "past" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Past Events
          {activeTab === "past" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visibleEvents.length > 0 ? visibleEvents.map((event) => (
          <Link
            href={`/events/${event.id}`}
            key={event.id}
            className="group block bg-card rounded-[2rem] border border-border/40 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
          >
            <div className="aspect-[16/9] overflow-hidden relative">
              <img
                src={event.image || `https://picsum.photos/seed/${event.title}/800/600`}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 shadow-sm flex flex-col items-center min-w-[50px]">
                <span className="text-[10px] font-black uppercase text-primary leading-none">{event.date.split(" ")[0]}</span>
                <span className="text-lg font-serif font-black text-slate-900 leading-none mt-1">{event.date.split(" ")[1]?.replace(",", "")}</span>
              </div>
            </div>

            <div className="p-8">
              <h3 className="text-2xl font-serif font-bold mb-4 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {getLocalized(event, "title")}
              </h3>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{getLocalized(event, "location")}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="font-medium">{event.date} • {event.time}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-border/40">
                <div className="flex items-center -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-7 w-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground ml-4 font-bold">+{event.attendees || 0} attending</span>
                </div>
                <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground transition-all">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </Link>
        )) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-xl text-muted-foreground font-serif italic">No events found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
