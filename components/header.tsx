"use client";

import Link from "next/link";
import { Search, Menu, X, Globe, User } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { useGlobalContext } from "@/lib/context";
import { useRouter, usePathname } from "next/navigation";
import { translations } from "@/lib/lang";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { language, setLanguage, setSearchQuery } = useGlobalContext();
  const router = useRouter();
  const pathname = usePathname();
  const t = translations[language];

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const navigation = [
    { name: t.nav.home || "Home", href: "/" },
    { name: t.nav.news, href: "/news" },
    { name: t.nav.events, href: "/events" },
    { name: t.nav.media, href: "/media" },
    { name: t.nav.about, href: "/about" },
    { name: t.nav.contact || "Contact", href: "/contact" },
  ];

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q") as string;
    setSearchQuery(query);
    router.push("/news");
    setIsSearchOpen(false);
  };

  const isItemActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/75 text-foreground supports-[backdrop-filter]:backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">University Media</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 h-full">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-all hover:text-primary h-full flex items-center relative px-1 ${
                isItemActive(item.href) ? "text-primary font-bold" : "text-foreground/80"
              }`}
            >
              {item.name}
              {isItemActive(item.href) && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1" />
              )}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isSearchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center animate-in fade-in slide-in-from-right-4">
              <input
                name="q"
                type="text"
                placeholder={t.common.search}
                autoFocus
                className="h-9 w-48 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onBlur={() => !isSearchOpen && setIsSearchOpen(false)}
              />
              <button type="button" onClick={() => setIsSearchOpen(false)} className="ml-2 hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <button onClick={() => setIsSearchOpen(true)} className="p-2 hover:bg-muted rounded-full transition-colors" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
          )}

          <div className="h-4 w-[1px] bg-border" />

          <div className="relative">
            <button onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center gap-1 text-sm font-medium cursor-pointer hover:text-primary/80 uppercase">
              <Globe className="h-4 w-4 mr-1" />
              {language}
            </button>
            {isLangOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-24 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg py-1 z-50 animate-in fade-in zoom-in-95">
                  <button onClick={() => { setLanguage("en"); setIsLangOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${language === "en" ? "text-primary font-bold" : ""}`}>English</button>
                  <button onClick={() => { setLanguage("uz"); setIsLangOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${language === "uz" ? "text-primary font-bold" : ""}`}>{`O'zbek`}</button>
                  <button onClick={() => { setLanguage("ru"); setIsLangOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${language === "ru" ? "text-primary font-bold" : ""}`}>Русский</button>
                </div>
              </>
            )}
          </div>

          <ModeToggle />

          <Link href="/admin" className="p-2 hover:bg-muted rounded-full transition-colors">
            <User className="h-5 w-5" />
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input name="q" type="text" placeholder={t.common.search} className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button type="submit" className="p-2 bg-primary text-primary-foreground rounded-md"><Search className="h-5 w-5" /></button>
            </form>
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block text-sm font-medium py-2 hover:bg-muted/50 rounded-md px-2 ${isItemActive(item.href) ? "text-primary font-bold bg-muted/30" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 flex items-center justify-between border-t border-border/40">
              <div className="flex items-center gap-4">
                <div className="flex bg-muted rounded-md p-1">
                  {(["en", "uz", "ru"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1 text-xs font-medium rounded-sm uppercase transition-colors ${language === lang ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <ModeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
