"use client";

import { MessageSquare, ThumbsUp, Send } from "lucide-react";
import { useState } from "react";

export function CommentsSection() {
    const [comments, setComments] = useState([
        { id: 1, user: "Alex Johnson", text: "This is a great initiative! Looking forward to seeing the results.", time: "2 hours ago", likes: 5 },
        { id: 2, user: "Maria Garcia", text: "Will there be opportunities for undergraduates to get involved?", time: "5 hours ago", likes: 12 },
    ]);

    return (
        <div className="border-t border-border/40 pt-8 mt-12 max-w-2xl">
            <h3 className="font-serif text-xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments ({comments.length})
            </h3>

            {/* Comment Form */}
            <div className="mb-10 flex gap-4">
                <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-3">
                    <textarea
                        placeholder="Join the discussion..."
                        className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none text-sm"
                    />
                    <div className="flex justify-end">
                        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                            <Send className="h-3 w-3" />
                            Post Comment
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments List */}
            <div className="space-y-6">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0">
                            {comment.user.charAt(0)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm">{comment.user}</h4>
                                <span className="text-xs text-muted-foreground">{comment.time}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{comment.text}</p>
                            <div className="flex items-center gap-4 mt-2">
                                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                                    <ThumbsUp className="h-3 w-3" />
                                    {comment.likes}
                                </button>
                                <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
                                    Reply
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
