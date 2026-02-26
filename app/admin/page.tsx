"use client";

import Link from "next/link";
import { FileText, Calendar, Bot, TrendingUp, Users, Eye } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

export default function AdminDashboard() {
    const { articles, events, analytics } = useGlobalContext();

    const stats = [
        {
            label: "Total Articles",
            value: articles.length,
            icon: <FileText className="h-5 w-5" />,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-500/10"
        },
        {
            label: "Total Events",
            value: events.length,
            icon: <Calendar className="h-5 w-5" />,
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-500/10"
        },
        {
            label: "Site Visits",
            value: analytics.totalVisits.toLocaleString(),
            icon: <Users className="h-5 w-5" />,
            color: "text-purple-600 dark:text-purple-400",
            bgColor: "bg-purple-500/10"
        },
        {
            label: "Article Views",
            value: (analytics?.totalArticleViews || 0).toLocaleString(),
            icon: <Eye className="h-5 w-5" />,
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-500/10"
        },
    ];

    const recentArticles = articles.slice(0, 5);
    const upcomingEvents = events.slice(0, 3);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold font-serif mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here's what's happening.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="p-6 rounded-xl border border-border/40 bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                <div className={stat.color}>{stat.icon}</div>
                            </div>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Articles */}
                <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Recent Articles</h2>
                        <Link href="/admin/articles" className="text-sm text-primary hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {recentArticles.map((article) => (
                            <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{article.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                            {article.category}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{article.date}</span>
                                    </div>
                                </div>
                                <Link
                                    href={`/admin/articles/new?edit=${article.id}`}
                                    className="text-xs text-primary hover:underline whitespace-nowrap"
                                >
                                    Edit
                                </Link>
                            </div>
                        ))}
                        {recentArticles.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No articles yet</p>
                        )}
                    </div>
                </div>

                {/* Popular Articles */}
                <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Popular Articles</h2>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-3">
                        {analytics.popularArticles.map((article) => (
                            <div key={article.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{article.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Eye className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{article.views} views</span>
                                    </div>
                                </div>
                                <Link
                                    href={`/admin/articles/new?edit=${article.id}`}
                                    className="text-xs text-primary hover:underline whitespace-nowrap"
                                >
                                    Edit
                                </Link>
                            </div>
                        ))}
                        {analytics.popularArticles.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border border-border/40 bg-card p-6">
                <h2 className="font-semibold text-lg mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href="/admin/about"
                        className="flex items-center gap-3 p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                            <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">About Content</p>
                            <p className="text-xs text-muted-foreground">Manage About Page</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/connections"
                        className="flex items-center gap-3 p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Connections Hub</p>
                            <p className="text-xs text-muted-foreground">Subscribers & Messages</p>
                        </div>
                    </Link>
                    <Link
                        href="/admin/media"
                        className="flex items-center gap-3 p-4 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors group"
                    >
                        <div className="p-2 rounded-lg bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                            <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="font-medium text-sm">Media Hub</p>
                            <p className="text-xs text-muted-foreground">Manage Gallery</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
