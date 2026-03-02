"use client";

import { Save, Globe, Bell, Shield, Palette } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
   const [settings, setSettings] = useState({
      siteName: "University Media Portal",
      contactEmail: "admin@university.edu",
      siteDescription: "The official news and media portal for University students and faculty.",
      metaTitle: "University Media | Latest News & Events",
      keywords: "university, news, events, campus life, research, education",
      defaultLanguage: "en",
      enableNotifications: true,
      enableComments: true,
      moderateComments: true,
      themeMode: "system",
   });

   const handleSave = () => {
      // In a real app, this would save to a database
      toast.success("Settings saved successfully!");
   };

   const handleReset = () => {
      if (confirm("Reset all settings to default?")) {
         setSettings({
            siteName: "University Media Portal",
            contactEmail: "admin@university.edu",
            siteDescription: "The official news and media portal for University students and faculty.",
            metaTitle: "University Media | Latest News & Events",
            keywords: "university, news, events, campus life, research, education",
            defaultLanguage: "en",
            enableNotifications: true,
            enableComments: true,
            moderateComments: true,
            themeMode: "system",
         });
         toast.info("Settings reset to defaults");
      }
   };

   return (
      <div className="max-w-3xl space-y-8">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-2xl font-bold font-serif mb-2">Settings</h1>
               <p className="text-muted-foreground">Manage general site configuration and admin preferences.</p>
            </div>
            <button
               onClick={handleReset}
               className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
               Reset to Defaults
            </button>
         </div>

         <div className="space-y-6">
            {/* General Site Settings */}
            <section className="p-6 rounded-xl border border-border/40 bg-card space-y-4">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  General Information
               </h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Site Name</label>
                        <input
                           type="text"
                           value={settings.siteName}
                           onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                           className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-medium">Contact Email</label>
                        <input
                           type="email"
                           value={settings.contactEmail}
                           onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                           className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Site Description</label>
                     <textarea
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Default Language</label>
                     <select
                        value={settings.defaultLanguage}
                        onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                     >
                        <option value="en">English</option>
                        <option value="uz">Uzbek</option>
                        <option value="ru">Russian</option>
                     </select>
                  </div>
               </div>
            </section>

            {/* SEO Settings */}
            <section className="p-6 rounded-xl border border-border/40 bg-card space-y-4">
               <h3 className="font-semibold text-lg">SEO & Metadata</h3>
               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Default Meta Title</label>
                     <input
                        type="text"
                        value={settings.metaTitle}
                        onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium">Keywords (comma-separated)</label>
                     <input
                        type="text"
                        value={settings.keywords}
                        onChange={(e) => setSettings({ ...settings, keywords: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                     />
                  </div>
               </div>
            </section>

            {/* Features & Preferences */}
            <section className="p-6 rounded-xl border border-border/40 bg-card space-y-4">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Features & Preferences
               </h3>
               <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-md border border-border/40 hover:bg-muted/50 cursor-pointer transition-colors">
                     <span className="text-sm font-medium">Enable push notifications</span>
                     <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={settings.enableNotifications}
                        onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                     />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-md border border-border/40 hover:bg-muted/50 cursor-pointer transition-colors">
                     <span className="text-sm font-medium">Enable comments on articles</span>
                     <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={settings.enableComments}
                        onChange={(e) => setSettings({ ...settings, enableComments: e.target.checked })}
                     />
                  </label>
                  <label className="flex items-center justify-between p-3 rounded-md border border-border/40 hover:bg-muted/50 cursor-pointer transition-colors">
                     <span className="text-sm font-medium">Moderate comments before publishing</span>
                     <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={settings.moderateComments}
                        onChange={(e) => setSettings({ ...settings, moderateComments: e.target.checked })}
                        disabled={!settings.enableComments}
                     />
                  </label>
               </div>
            </section>

            {/* Appearance */}
            <section className="p-6 rounded-xl border border-border/40 bg-card space-y-4">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Appearance
               </h3>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Default Theme Mode</label>
                  <select
                     value={settings.themeMode}
                     onChange={(e) => setSettings({ ...settings, themeMode: e.target.value })}
                     className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                     <option value="light">Light</option>
                     <option value="dark">Dark</option>
                     <option value="system">System</option>
                  </select>
               </div>
            </section>

            {/* Security */}
            <section className="p-6 rounded-xl border border-border/40 bg-card space-y-4">
               <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Data
               </h3>
               <div className="space-y-3">
                  <button className="w-full p-3 rounded-md border border-border/40 hover:bg-muted text-left text-sm font-medium transition-colors">
                     Change Admin Password
                  </button>
                  <button className="w-full p-3 rounded-md border border-border/40 hover:bg-muted text-left text-sm font-medium transition-colors">
                     Manage API Keys
                  </button>
                  <button className="w-full p-3 rounded-md border border-border/40 hover:bg-muted text-left text-sm font-medium transition-colors">
                     Clear All Cache
                  </button>
                  <button
                     onClick={() => {
                        if (confirm('⚠️ This will permanently delete ALL articles and events from localStorage. Continue?')) {
                           localStorage.removeItem('articles');
                           localStorage.removeItem('events');
                           window.location.reload();
                        }
                     }}
                     className="w-full p-3 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground text-left text-sm font-medium transition-colors"
                  >
                     Clear All Data (Articles & Events)
                  </button>
               </div>
            </section>

            <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
               <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:bg-primary/90 transition-colors"
               >
                  <Save className="h-4 w-4" />
                  Save Changes
               </button>
            </div>
         </div>
      </div>
   );
}
