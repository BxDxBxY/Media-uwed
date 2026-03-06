"use client";

import { Mail, Phone, MapPin } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

export default function AboutPage() {
  const { aboutContent, aboutConfig, language } = useGlobalContext();

  const heroTitle = language === "ru"
    ? aboutContent?.titleRu || aboutContent?.title || "About Us"
    : language === "uz"
      ? aboutContent?.titleUz || aboutContent?.title || "About Us"
      : aboutContent?.title || "About Us";

  const heroSubtitle = language === "ru"
    ? aboutContent?.contentRu || aboutContent?.content || ""
    : language === "uz"
      ? aboutContent?.contentUz || aboutContent?.content || ""
      : aboutContent?.content || "";

  const missionTitle = aboutConfig?.missionTitle?.[language] || "Our Mission";
  const missionBody = aboutConfig?.missionBody?.[language] || "";
  const missionParagraphs = missionBody.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const teamTitle = aboutConfig?.teamTitle?.[language] || "Meet the Team";
  const contactTitle = aboutConfig?.contactTitle?.[language] || "Contact Us";

  const team = (aboutConfig?.team || []).map((member) => ({
    name: member.name,
    role: member.role?.[language] || member.role?.en || "",
    image: member.image,
    email: member.email,
  }));

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <header className="mb-16 text-center">
        <h1 className="text-3xl md:text-5xl font-serif font-bold mb-6">{heroTitle}</h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto text-balance">
          {heroSubtitle}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 items-center">
        <div className="space-y-6">
          <h2 className="text-2xl font-serif font-bold">{missionTitle}</h2>
          <div className="prose dark:prose-invert max-w-none text-base leading-8 text-justify">
            {missionParagraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>
        <div className="aspect-square relative rounded-2xl overflow-hidden bg-muted">
          <img
            src={aboutContent?.image || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2670&auto=format&fit=crop"}
            alt="Editorial Team working together"
            className="object-cover w-full h-full"
          />
        </div>
      </div>

      <div className="mb-20">
        <h2 className="text-2xl font-serif font-bold text-center mb-12">{teamTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <div key={i} className="text-center group">
              <div className="aspect-square rounded-full overflow-hidden mx-auto mb-4 border-2 border-border/40 w-32 h-32 relative">
                <img
                  src={member.image}
                  alt={member.name}
                  className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="font-bold text-lg">{member.name}</h3>
              <p className="text-sm text-primary">{member.role}</p>
              {!!member.email && <p className="text-xs text-muted-foreground mt-1">{member.email}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-8 md:p-12 text-center space-y-8">
        <h2 className="text-2xl font-serif font-bold">{contactTitle}</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <p className="font-medium">{aboutConfig?.contactEmail || "editor@university.edu"}</p>
            <p className="text-xs text-muted-foreground">{aboutConfig?.contactEmailHint?.[language] || "For press releases & tips"}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
              <Phone className="h-5 w-5" />
            </div>
            <p className="font-medium">{aboutConfig?.contactPhone || "+1 (555) 123-4567"}</p>
            <p className="text-xs text-muted-foreground">{aboutConfig?.contactPhoneHint?.[language] || "Newsroom Direct Line"}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="font-medium">{aboutConfig?.contactAddress || "Student Center, Room 304"}</p>
            <p className="text-xs text-muted-foreground">{aboutConfig?.contactAddressHint?.[language] || "University Campus"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
