"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

export default function AboutPage() {
  const { aboutContent, language } = useGlobalContext();

  const title = language === "ru"
    ? aboutContent?.titleRu || aboutContent?.title || "О нас"
    : language === "uz"
      ? aboutContent?.titleUz || aboutContent?.title || "Biz haqimizda"
      : aboutContent?.title || "About Us";

  const description = language === "ru"
    ? aboutContent?.contentRu || aboutContent?.content || "Информация о нашей платформе скоро появится."
    : language === "uz"
      ? aboutContent?.contentUz || aboutContent?.content || "Platformamiz haqida ma'lumot tez orada qo'shiladi."
      : aboutContent?.content || "Our platform story will be available soon.";

  const contactTitle = language === "ru" ? "Связаться с нами" : language === "uz" ? "Biz bilan bog'lanish" : "Contact Us";
  const pressHint = language === "ru" ? "Для пресс-релизов и подсказок" : language === "uz" ? "Press-reliz va maslahatlar uchun" : "For press releases & tips";
  const newsroomHint = language === "ru" ? "Прямая линия редакции" : language === "uz" ? "Tahririyatning to'g'ridan-to'g'ri liniyasi" : "Newsroom Direct Line";
  const campusHint = language === "ru" ? "Кампус университета" : language === "uz" ? "Universitet kampusi" : "University Campus";

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <header className="mb-14 text-center">
        <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6">{title}</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16 items-center">
        <div className="space-y-4">
          <div className="prose dark:prose-invert max-w-none">
            {description
              .split(/\n{2,}/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
        </div>

        <div className="aspect-square relative rounded-2xl overflow-hidden bg-muted border border-border/40">
          {aboutContent?.image ? (
            <img src={aboutContent.image} alt={title} className="object-cover w-full h-full" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm text-center px-8">
              {language === "ru"
                ? "Изображение можно добавить в админ-панели (About Us)."
                : language === "uz"
                  ? "Rasmni admin paneldagi About Us bo'limidan qo'shishingiz mumkin."
                  : "You can set the About Us image from the admin panel."}
            </div>
          )}
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-8 md:p-12 text-center space-y-8">
        <h2 className="text-2xl font-serif font-bold">{contactTitle}</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <p className="font-medium">editor@university.edu</p>
            <p className="text-xs text-muted-foreground">{pressHint}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
              <Phone className="h-5 w-5" />
            </div>
            <p className="font-medium">+1 (555) 123-4567</p>
            <p className="text-xs text-muted-foreground">{newsroomHint}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="font-medium">Student Center, Room 304</p>
            <p className="text-xs text-muted-foreground">{campusHint}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
