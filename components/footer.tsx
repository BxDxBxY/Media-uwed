"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Twitter, Instagram, Youtube, Mail } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

function localizedCategory(category: string, language: "en" | "uz" | "ru") {
  const map: Record<string, { en: string; uz: string; ru: string }> = {
    World: { en: "World", uz: "Jahon", ru: "Мир" },
    University: { en: "University", uz: "Universitet", ru: "Университет" },
    Politics: { en: "Politics", uz: "Siyosat", ru: "Политика" },
    Technology: { en: "Technology", uz: "Texnologiya", ru: "Технологии" },
    Culture: { en: "Culture", uz: "Madaniyat", ru: "Культура" },
    Sports: { en: "Sports", uz: "Sport", ru: "Спорт" },
  };

  return map[category]?.[language] || category;
}

export function Footer() {
  const { articles, addSubscriber, language } = useGlobalContext();
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  const categoryPriority = ["World", "University", "Politics", "Technology", "Culture", "Sports"];
  const available = new Set(
    articles.flatMap((a: any) => [a.category, ...(Array.isArray(a.categories) ? a.categories.map((c: any) => c?.name) : [])]).filter(Boolean),
  );

  const categories = categoryPriority.filter((cat) => available.has(cat)).slice(0, 4);

  const t = {
    brandDesc:
      language === "ru"
        ? "Объединяем студентов, преподавателей и выпускников через важные истории."
        : language === "uz"
          ? "Talabalar, ustozlar va bitiruvchilarni muhim hikoyalar orqali bog'laymiz."
          : "Connecting students, faculty, and alumni through stories that matter.",
    quickLinks: language === "ru" ? "Быстрые ссылки" : language === "uz" ? "Tezkor havolalar" : "Quick Links",
    categories: language === "ru" ? "Категории" : language === "uz" ? "Kategoriyalar" : "Categories",
    subscribe: language === "ru" ? "Подписка" : language === "uz" ? "Obuna" : "Subscribe",
    newsletterHelp:
      language === "ru"
        ? "Получайте последние университетские новости прямо на почту."
        : language === "uz"
          ? "Universitet yangiliklarini to'g'ridan-to'g'ri emailingizga oling."
          : "Get the latest university news directly in your inbox.",
    emailPlaceholder:
      language === "ru" ? "Введите email" : language === "uz" ? "Email kiriting" : "Enter your email",
    allRights:
      language === "ru"
        ? "Все права защищены."
        : language === "uz"
          ? "Barcha huquqlar himoyalangan."
          : "All rights reserved.",
    news: language === "ru" ? "Новости" : language === "uz" ? "Yangiliklar" : "News",
    events: language === "ru" ? "События" : language === "uz" ? "Tadbirlar" : "Events",
    media: language === "ru" ? "Медиа" : language === "uz" ? "Media galereya" : "Media Gallery",
    contact: language === "ru" ? "Контакты" : language === "uz" ? "Bog'lanish" : "Contact Us",
    privacy: language === "ru" ? "Конфиденциальность" : language === "uz" ? "Maxfiylik" : "Privacy Policy",
    terms: language === "ru" ? "Условия использования" : language === "uz" ? "Foydalanish shartlari" : "Terms of Use",
  };

  return (
    <footer className="bg-muted/20 border-t border-border/40">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold">University Media</h3>
            <p className="text-sm text-muted-foreground">{t.brandDesc}</p>
            <div className="flex space-x-4">
              <Link href="#" className="text-muted-foreground hover:text-primary"><Facebook className="h-5 w-5" /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Twitter className="h-5 w-5" /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Instagram className="h-5 w-5" /></Link>
              <Link href="#" className="text-muted-foreground hover:text-primary"><Youtube className="h-5 w-5" /></Link>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-4">{t.quickLinks}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/news" className="hover:text-primary">{t.news}</Link></li>
              <li><Link href="/events" className="hover:text-primary">{t.events}</Link></li>
              <li><Link href="/media" className="hover:text-primary">{t.media}</Link></li>
              <li><Link href="/contact" className="hover:text-primary">{t.contact}</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-primary">{t.privacy}</Link></li>
              <li><Link href="/terms-of-use" className="hover:text-primary">{t.terms}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">{t.categories}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categories.length > 0 ? categories.map((cat) => (
                <li key={cat}>
                  <Link href={`/news?category=${encodeURIComponent(cat)}`} className="hover:text-primary">
                    {localizedCategory(cat, language)}
                  </Link>
                </li>
              )) : (
                <li><Link href="/news" className="hover:text-primary">{language === "ru" ? "Главные новости" : language === "uz" ? "Asosiy yangiliklar" : "Top stories"}</Link></li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-4">{t.subscribe}</h4>
            <p className="text-sm text-muted-foreground mb-4">{t.newsletterHelp}</p>
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
              <input name="email" type="email" required placeholder={t.emailPlaceholder} className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md text-sm font-medium" aria-label="Subscribe">
                <Mail className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} University Media Portal. {t.allRights}</p>
        </div>
      </div>
    </footer>
  );
}
