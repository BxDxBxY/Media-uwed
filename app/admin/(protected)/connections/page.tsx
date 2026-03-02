"use client";

import { useGlobalContext } from "@/lib/context";
import { Mail, MessageSquare, User, Calendar, CheckCircle2, MoreHorizontal, Inbox } from "lucide-react";
import { useState } from "react";

export default function AdminConnectionsPage() {
    const { subscribers, messages, isLoading } = useGlobalContext();
    const [activeView, setActiveView] = useState<"messages" | "subscribers">("messages");

    if (isLoading) return <div className="p-20 text-center">Loading connections...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Connections Hub</h1>
                    <p className="text-muted-foreground mt-1">Manage your audience and inquiries in one place.</p>
                </div>

                <div className="flex bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setActiveView("messages")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "messages" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                        <MessageSquare className="inline-block h-4 w-4 mr-2" />
                        Messages ({messages.length})
                    </button>
                    <button
                        onClick={() => setActiveView("subscribers")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "subscribers" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    >
                        <User className="inline-block h-4 w-4 mr-2" />
                        Subscribers ({subscribers.length})
                    </button>
                </div>
            </div>

            {activeView === "messages" ? (
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <Inbox className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{msg.subject}</h3>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <span className="font-medium text-foreground">{msg.name}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {msg.email}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(msg.createdAt!).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 border border-border rounded-md hover:bg-muted"><MoreHorizontal className="h-4 w-4" /></button>
                                    </div>
                                </div>
                                <div className="pl-16">
                                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {msg.message}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground">No messages yet.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead className="bg-muted/50 border-b border-border/40">
                            <tr>
                                <th className="px-6 py-4 text-sm font-bold">Email Address</th>
                                <th className="px-6 py-4 text-sm font-bold">Date Subscribed</th>
                                <th className="px-6 py-4 text-sm font-bold">Status</th>
                                <th className="px-6 py-4 text-sm font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {subscribers.map((sub) => (
                                <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                                                <Mail className="h-4 w-4" />
                                            </div>
                                            <span className="font-medium">{sub.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(sub.createdAt!).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                            <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-sm font-medium text-destructive hover:underline">Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {subscribers.length === 0 && (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground font-serif italic text-lg">No subscribers yet.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
