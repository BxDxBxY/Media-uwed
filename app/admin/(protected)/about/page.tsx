"use client";

import { useGlobalContext } from "@/lib/context";
import { useState, useEffect } from "react";
import { Save, Loader2, Globe, Image as ImageIcon, Users, Mail, Phone, MapPin } from "lucide-react";
import type { AboutPageConfig } from "@/lib/about-page-config";

const defaultConfig: AboutPageConfig = {
  missionTitle: { en: "Our Mission", ru: "Наша миссия", uz: "Bizning missiyamiz" },
  missionBody: { en: "", ru: "", uz: "" },
  teamTitle: { en: "Meet the Team", ru: "Наша команда", uz: "Jamoa bilan tanishing" },
  contactTitle: { en: "Contact Us", ru: "Свяжитесь с нами", uz: "Biz bilan bog'laning" },
  contactEmail: "editor@university.edu",
  contactEmailHint: { en: "For press releases & tips", ru: "Для пресс-релизов и подсказок", uz: "Press-reliz va maslahatlar uchun" },
  contactPhone: "+1 (555) 123-4567",
  contactPhoneHint: { en: "Newsroom Direct Line", ru: "Прямая линия редакции", uz: "Tahririyat liniyasi" },
  contactAddress: "Student Center, Room 304",
  contactAddressHint: { en: "University Campus", ru: "Кампус университета", uz: "Universitet kampusi" },
  team: [],
};

export default function AdminAboutPage() {
  const { aboutContent, aboutConfig, updateAboutContent, isLoading } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<"en" | "ru" | "uz">("en");
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    titleRu: "",
    titleUz: "",
    content: "",
    contentRu: "",
    contentUz: "",
    image: "",
  });
  const [config, setConfig] = useState<AboutPageConfig>(defaultConfig);

  useEffect(() => {
    if (aboutContent) {
      setFormData({
        title: aboutContent.title || "",
        titleRu: aboutContent.titleRu || "",
        titleUz: aboutContent.titleUz || "",
        content: aboutContent.content || "",
        contentRu: aboutContent.contentRu || "",
        contentUz: aboutContent.contentUz || "",
        image: aboutContent.image || "",
      });
    }
  }, [aboutContent]);

  useEffect(() => {
    if (aboutConfig) setConfig(aboutConfig);
  }, [aboutConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAboutContent({ about: formData, config });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold">About Us Management</h1>
          <p className="text-muted-foreground">Manage title, subtitle, mission text, team, and contact details for all languages.</p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex border-b border-border/40 bg-muted/30">
          {(["en", "ru", "uz"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveTab(lang)}
              type="button"
              className={`px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${
                activeTab === lang ? "text-primary bg-card" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="h-3 w-3" />
                {lang === "en" ? "English" : lang === "ru" ? "Russian" : "Uzbek"}
              </div>
              {activeTab === lang && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Main Image URL</label>
            <div className="relative">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Page Title</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background"
                value={activeTab === "en" ? formData.title : activeTab === "ru" ? formData.titleRu : formData.titleUz}
                onChange={(e) => {
                  const value = e.target.value;
                  if (activeTab === "en") setFormData((p) => ({ ...p, title: value }));
                  else if (activeTab === "ru") setFormData((p) => ({ ...p, titleRu: value }));
                  else setFormData((p) => ({ ...p, titleUz: value }));
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Subheader</label>
              <textarea
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background"
                value={activeTab === "en" ? formData.content : activeTab === "ru" ? formData.contentRu : formData.contentUz}
                onChange={(e) => {
                  const value = e.target.value;
                  if (activeTab === "en") setFormData((p) => ({ ...p, content: value }));
                  else if (activeTab === "ru") setFormData((p) => ({ ...p, contentRu: value }));
                  else setFormData((p) => ({ ...p, contentUz: value }));
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Mission Title</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background"
              value={config.missionTitle[activeTab]}
              onChange={(e) => setConfig((prev) => ({ ...prev, missionTitle: { ...prev.missionTitle, [activeTab]: e.target.value } }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Mission Detailed Paragraphs</label>
            <textarea
              rows={8}
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background"
              value={config.missionBody[activeTab]}
              onChange={(e) => setConfig((prev) => ({ ...prev, missionBody: { ...prev.missionBody, [activeTab]: e.target.value } }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Team Section Title</label>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background"
              value={config.teamTitle[activeTab]}
              onChange={(e) => setConfig((prev) => ({ ...prev, teamTitle: { ...prev.teamTitle, [activeTab]: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl p-8 space-y-5">
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Team Members (name, role, email, image)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.team.map((member, index) => (
            <div key={index} className="rounded-xl border border-border/50 p-4 space-y-3 bg-muted/20">
              <input
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
                placeholder="Name"
                value={member.name}
                onChange={(e) => setConfig((prev) => ({ ...prev, team: prev.team.map((m, i) => (i === index ? { ...m, name: e.target.value } : m)) }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
                placeholder="Role"
                value={member.role[activeTab]}
                onChange={(e) => setConfig((prev) => ({ ...prev, team: prev.team.map((m, i) => (i === index ? { ...m, role: { ...m.role, [activeTab]: e.target.value } } : m)) }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
                placeholder="Email"
                value={member.email}
                onChange={(e) => setConfig((prev) => ({ ...prev, team: prev.team.map((m, i) => (i === index ? { ...m, email: e.target.value } : m)) }))}
              />
              <input
                className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
                placeholder="Image URL"
                value={member.image}
                onChange={(e) => setConfig((prev) => ({ ...prev, team: prev.team.map((m, i) => (i === index ? { ...m, image: e.target.value } : m)) }))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border/40 rounded-2xl p-8 space-y-5">
        <h2 className="text-xl font-bold">Contact Block</h2>
        <input
          className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background"
          placeholder="Contact section title"
          value={config.contactTitle[activeTab]}
          onChange={(e) => setConfig((prev) => ({ ...prev, contactTitle: { ...prev.contactTitle, [activeTab]: e.target.value } }))}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background" value={config.contactEmail} onChange={(e) => setConfig((prev) => ({ ...prev, contactEmail: e.target.value }))} />
            <input className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background" value={config.contactEmailHint[activeTab]} onChange={(e) => setConfig((prev) => ({ ...prev, contactEmailHint: { ...prev.contactEmailHint, [activeTab]: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background" value={config.contactPhone} onChange={(e) => setConfig((prev) => ({ ...prev, contactPhone: e.target.value }))} />
            <input className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background" value={config.contactPhoneHint[activeTab]} onChange={(e) => setConfig((prev) => ({ ...prev, contactPhoneHint: { ...prev.contactPhoneHint, [activeTab]: e.target.value } }))} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Address</label>
            <input className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background" value={config.contactAddress} onChange={(e) => setConfig((prev) => ({ ...prev, contactAddress: e.target.value }))} />
            <input className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background" value={config.contactAddressHint[activeTab]} onChange={(e) => setConfig((prev) => ({ ...prev, contactAddressHint: { ...prev.contactAddressHint, [activeTab]: e.target.value } }))} />
          </div>
        </div>
      </div>
    </form>
  );
}
