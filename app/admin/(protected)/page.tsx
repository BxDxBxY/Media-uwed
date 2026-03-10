"use client";

import Link from "next/link";
import { FileText, Calendar, TrendingUp, Users, Eye, ArrowUpRight } from "lucide-react";
import { useGlobalContext } from "@/lib/context";

export default function AdminDashboard() {
    const { articles, events, analytics } = useGlobalContext();

    const stats = [
        {
            label: "Total Articles",
            value: articles.length,
            icon: <FileText className="h-5 w-5" />,
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-500/10",
        },
        {
            label: "Total Events",
            value: events.length,
            icon: <Calendar className="h-5 w-5" />,
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-500/10",
        },
        {
            label: "Site Visits",
            value: analytics.totalVisits.toLocaleString(),
            icon: <Users className="h-5 w-5" />,
            color: "text-purple-600 dark:text-purple-400",
            bgColor: "bg-purple-500/10",
            href: "/admin/stats/visits",
        },
        {
            label: "Article Views",
            value: (analytics?.totalArticleViews || 0).toLocaleString(),
            icon: <Eye className="h-5 w-5" />,
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-500/10",
            href: "/admin/stats/views",
        },
    ];

    const recentArticles = articles.slice(0, 5);

    const topViews = Math.max(1, ...analytics.popularArticles.map((a) => a.views || 0));

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold font-serif mb-2">Dashboard</h1>
                <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => {
                    const Card = (
                        <div className="p-6 rounded-xl border border-border/40 bg-card hover:shadow-md transition-shadow h-full">
                            <div className="flex items-center justify-between mb-3">
                                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                    <div className={stat.color}>{stat.icon}</div>
                                </div>
                                {stat.href ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold">{stat.value}</p>
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                            </div>
                        </div>
                    );

                    return stat.href ? (
                        <Link key={index} href={stat.href} className="block">
                            {Card}
                        </Link>
                    ) : (
                        <div key={index}>{Card}</div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                <Link href={`/admin/articles/new?edit=${article.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">
                                    Edit
                                </Link>
                            </div>
                        ))}
                        {recentArticles.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No articles yet</p>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-border/40 bg-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-lg">Popular Articles</h2>
                        <Link href="/admin/stats/views" className="text-sm text-primary hover:underline">Open details</Link>
                    </div>
                    <div className="space-y-3">
                        {analytics.popularArticles.map((article) => (
                            <div key={article.id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm gap-3">
                                    <p className="truncate font-medium">{article.title}</p>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">{article.views} views</span>
                                </div>
                                <div className="h-2 rounded bg-muted overflow-hidden">
                                    <div className="h-full bg-primary" style={{ width: `${Math.max(8, (article.views / topViews) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                        {analytics.popularArticles.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-8">No view data yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
