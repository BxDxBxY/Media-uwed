"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube, Mail } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

export function Footer() {
  const { articles, addSubscriber } = useGlobalContext();

  // Dynamic Categories from Articles
  const categoryCounts = articles.reduce((acc, art) => {
    acc[art.category] = (acc[art.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categories = Object.keys(categoryCounts).slice(0, 4);

  return (
    <footer className="bg-muted/30 border-t border-border/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold">University Media</h3>
            <p className="text-sm text-muted-foreground">
              Connecting students, faculty, and alumni through stories that matter.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Instagram className="h-5 w-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Youtube className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/news" className="hover:text-primary">News</Link></li>
              <li><Link href="/events" className="hover:text-primary">Events</Link></li>
              <li><Link href="/media" className="hover:text-primary">Media Gallery</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact Us</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-medium mb-4">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categories.length > 0 ? categories.map((cat) => (
                <li key={cat}>
                  <Link href={`/news?category=${cat}`} className="hover:text-primary capitalize">
                    {cat}
                  </Link>
                </li>
              )) : (
                <>
                  <li><Link href="/news" className="hover:text-primary">Campus Life</Link></li>
                  <li><Link href="/news" className="hover:text-primary">Academics</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-medium mb-4">Subscribe</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Get the latest university news directly in your inbox.
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
              className="flex gap-2"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                aria-label="Subscribe"
              >
                <Mail className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} University Media Portal. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
