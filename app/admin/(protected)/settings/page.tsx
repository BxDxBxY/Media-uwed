"use client";

import { Save, Globe, Bell, Palette, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SiteSettings = {
  siteName: string;
  contactEmail: string;
  siteDescription: string;
  metaTitle: string;
  keywords: string;
  defaultLanguage: string;
  enableNotifications: boolean;
  enableComments: boolean;
  moderateComments: boolean;
  themeMode: string;
};

const defaultSettings: SiteSettings = {
  siteName: "University Media Portal",
  contactEmail: "admin@university.edu",
  siteDescription:
    "The official news and media portal for University students and faculty.",
  metaTitle: "University Media | Latest News & Events",
  keywords: "university, news, events, campus life, research, education",
  defaultLanguage: "en",
  enableNotifications: true,
  enableComments: true,
  moderateComments: true,
  themeMode: "system",
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings");
        if (!response.ok) throw new Error("Failed to fetch settings");

        const data = await response.json();
        setSettings({
          siteName: data.settings.siteName,
          contactEmail: data.settings.contactEmail,
          siteDescription: data.settings.siteDescription,
          metaTitle: data.settings.metaTitle,
          keywords: data.settings.keywords,
          defaultLanguage: data.settings.defaultLanguage,
          enableNotifications: data.settings.enableNotifications,
          enableComments: data.settings.enableComments,
          moderateComments: data.settings.moderateComments,
          themeMode: data.settings.themeMode,
        });
      } catch {
        toast.error("Could not load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const persistSettings = async (nextSettings: SiteSettings, successMessage: string) => {
    const response = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSettings),
    });

    if (!response.ok) throw new Error("Failed to save settings");

    setSettings(nextSettings);
    toast.success(successMessage);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await persistSettings(settings, "Settings saved successfully!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all settings to default?")) return;

    setIsResetting(true);
    try {
      await persistSettings(defaultSettings, "Settings reset to defaults");
    } catch {
      toast.error("Failed to reset settings");
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return <div className="p-20 text-center">Loading settings...</div>;
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 font-serif text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage general site configuration and admin preferences.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={isResetting || isSaving}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {isResetting ? "Resetting..." : "Reset to Defaults"}
        </button>
      </div>

      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Globe className="h-5 w-5" />
            General Information
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Site Name</label>
                <input type="text" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Email</label>
                <input type="email" value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Site Description</label>
              <textarea value={settings.siteDescription} onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })} className="min-h-[100px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Language</label>
              <select value={settings.defaultLanguage} onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="en">English</option>
                <option value="uz">Uzbek</option>
                <option value="ru">Russian</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
          <h3 className="text-lg font-semibold">SEO & Metadata</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Meta Title</label>
              <input type="text" value={settings.metaTitle} onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SEO Keywords</label>
              <input type="text" value={settings.keywords} onChange={(e) => setSettings({ ...settings, keywords: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Bell className="h-5 w-5" />
            Features & Preferences
          </h3>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/40 p-3 transition-colors hover:bg-muted/50">
              <span className="text-sm font-medium">Enable push notifications</span>
              <input type="checkbox" className="h-4 w-4" checked={settings.enableNotifications} onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })} />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/40 p-3 transition-colors hover:bg-muted/50">
              <span className="text-sm font-medium">Enable comments on articles</span>
              <input type="checkbox" className="h-4 w-4" checked={settings.enableComments} onChange={(e) => setSettings({ ...settings, enableComments: e.target.checked })} />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-md border border-border/40 p-3 transition-colors hover:bg-muted/50">
              <span className="text-sm font-medium">Moderate comments before publishing</span>
              <input type="checkbox" className="h-4 w-4" checked={settings.moderateComments} onChange={(e) => setSettings({ ...settings, moderateComments: e.target.checked })} disabled={!settings.enableComments} />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5" />
            Appearance
          </h3>
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Theme Mode</label>
            <select value={settings.themeMode} onChange={(e) => setSettings({ ...settings, themeMode: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
        </section>

        <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
          <button onClick={handleSave} disabled={isSaving || isResetting} className="flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
