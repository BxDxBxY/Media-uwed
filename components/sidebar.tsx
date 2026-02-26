import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

export function Sidebar() {
  const { articles, events, addSubscriber } = useGlobalContext();

  // Dynamic Categories from Articles
  const categoryCounts = articles.reduce((acc, art) => {
    acc[art.category] = (acc[art.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));

  // Dynamic Upcoming Events
  const upcomingEvents = events.slice(0, 3);

  return (
    <aside className="space-y-8">
      {/* Categories Widget */}
      <div className="p-6 rounded-xl border border-border/40 bg-card">
        <h3 className="font-serif text-lg font-bold mb-4">Categories</h3>
        <ul className="space-y-2">
          {categories.length > 0 ? categories.map((cat) => (
            <li key={cat.name}>
              <Link href={`/news?category=${cat.name}`} className="group flex items-center justify-between text-sm py-1">
                <span className="text-muted-foreground group-hover:text-primary transition-colors">{cat.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-xs text-secondary-foreground">
                  {cat.count}
                </span>
              </Link>
            </li>
          )) : <li className="text-sm text-muted-foreground">No categories found</li>}
        </ul>
      </div>

      {/* Events Widget */}
      <div className="p-6 rounded-xl border border-border/40 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg font-bold">Upcoming Events</h3>
          <Link href="/events" className="text-xs font-medium text-primary hover:underline">View All</Link>
        </div>
        <ul className="space-y-4">
          {upcomingEvents.map((event) => (
            <li key={event.id}>
              <Link href={`/events/${event.id}`} className="flex gap-3 items-start group">
                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-md bg-secondary text-secondary-foreground shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <span className="text-[10px] font-bold uppercase">{event.date.split(' ')[0]}</span>
                  <span className="text-lg font-bold leading-none">{event.date.split(' ')[1].replace(',', '')}</span>
                </div>
                <div>
                  <h4 className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {event.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {event.location}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {upcomingEvents.length === 0 && (
            <li className="text-sm text-muted-foreground italic">No upcoming events</li>
          )}
        </ul>
      </div>

      {/* Newsletter Widget */}
      <div className="p-6 rounded-xl bg-primary text-primary-foreground">
        <h3 className="font-serif text-lg font-bold mb-2">Stay Updated</h3>
        <p className="text-sm text-primary-foreground/80 mb-4">
          Subscribe to our weekly newsletter for the latest campus news.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const email = (e.currentTarget.elements as any).email.value;
            if (email) {
              addSubscriber(email);
              (e.target as HTMLFormElement).reset();
            }
          }}
          className="space-y-2"
        >
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="w-full px-3 py-2 rounded-md bg-primary-foreground/10 border border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button type="submit" className="w-full bg-background text-foreground hover:bg-background/90 font-medium py-2 rounded-md text-sm transition-colors">
            Subscribe Now
          </button>
        </form>
      </div>
    </aside>
  );
}
