"use client";

import { useGlobalContext } from "@/lib/context";
import {
  Mail,
  MessageSquare,
  User,
  Calendar,
  CheckCircle2,
  MoreHorizontal,
  Inbox,
  Loader2,
  Reply,
  Send,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminConnectionsPage() {
  const { subscribers, messages, isLoading, deleteSubscriber, refreshData } =
    useGlobalContext();
  const [activeView, setActiveView] = useState<"messages" | "subscribers">(
    "messages",
  );
  const [removingSubscriberId, setRemovingSubscriberId] = useState<string | null>(
    null,
  );
  const [pendingActionByMessageId, setPendingActionByMessageId] = useState<
    Record<string, string>
  >({});
  const [hiddenSubscriberIds, setHiddenSubscriberIds] = useState<Set<string>>(
    new Set(),
  );
  const [localMessages, setLocalMessages] = useState(messages);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replySubject, setReplySubject] = useState("Re: ");
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [audience, setAudience] = useState<"subscribers" | "messages" | "both">(
    "both",
  );
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const visibleSubscribers = useMemo(
    () => subscribers.filter((sub) => !hiddenSubscriberIds.has(sub.id)),
    [subscribers, hiddenSubscriberIds],
  );

  const startReply = (messageId: string, subject: string) => {
    setReplyTargetId(messageId);
    setReplySubject(subject.startsWith("Re:") ? subject : `Re: ${subject}`);
    setReplyMessage("");
  };

  const sendReply = async () => {
    if (!replyTargetId || !replySubject.trim() || !replyMessage.trim()) {
      toast.error("Subject and message are required");
      return;
    }

    setSendingReply(true);
    try {
      const response = await fetch(`/api/admin/messages/${replyTargetId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: replySubject, message: replyMessage }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to send reply");

      toast.success("Reply sent successfully");
      setReplyTargetId(null);
      setReplyMessage("");
      setReplySubject("Re: ");
      await refreshData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      toast.error("Broadcast subject and message are required");
      return;
    }

    setSendingBroadcast(true);
    try {
      const response = await fetch("/api/admin/messages/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          subject: broadcastSubject,
          message: broadcastMessage,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Failed to send broadcast");

      toast.success(`Broadcast sent: ${data.sent} delivered, ${data.failed} failed`);
      setBroadcastMessage("");
      setBroadcastSubject("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send broadcast");
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleRemoveSubscriber = async (subscriberId: string) => {
    setRemovingSubscriberId(subscriberId);
    setHiddenSubscriberIds((prev) => new Set(prev).add(subscriberId));

    try {
      await deleteSubscriber(subscriberId);
    } catch {
      setHiddenSubscriberIds((prev) => {
        const next = new Set(prev);
        next.delete(subscriberId);
        return next;
      });
      toast.error("Failed to remove subscriber");
    } finally {
      setRemovingSubscriberId(null);
    }
  };

  const handleMessageAction = async (
    messageId: string,
    action: "delete" | "archive" | "mark-read" | "mark-unread",
  ) => {
    const previousMessages = localMessages;
    setPendingActionByMessageId((prev) => ({ ...prev, [messageId]: action }));

    if (action === "delete" || action === "archive") {
      setLocalMessages((prev) => prev.filter((message) => message.id !== messageId));
    } else {
      setLocalMessages((prev) =>
        prev.map((message) =>
          message.id === messageId
            ? {
                ...message,
                readAt:
                  action === "mark-read"
                    ? message.readAt || new Date().toISOString()
                    : null,
              }
            : message,
        ),
      );
    }

    try {
      const endpoint =
        action === "delete"
          ? `/api/admin/messages/${messageId}`
          : action === "archive"
            ? `/api/admin/messages/${messageId}/archive`
            : action === "mark-read"
              ? `/api/admin/messages/${messageId}/read`
              : `/api/admin/messages/${messageId}/unread`;
      const method = action === "delete" ? "DELETE" : "PATCH";

      const response = await fetch(endpoint, { method });
      if (!response.ok) throw new Error("Request failed");

      toast.success(
        action === "delete"
          ? "Message deleted"
          : action === "archive"
            ? "Message archived"
            : action === "mark-read"
              ? "Message marked as read"
              : "Message marked as unread",
      );
      await refreshData();
    } catch {
      setLocalMessages(previousMessages);
      toast.error("Failed to update message");
    } finally {
      setPendingActionByMessageId((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });
    }
  };

  if (isLoading) return <div className="p-20 text-center">Loading connections...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Connections Hub</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your audience and inquiries in one place.
          </p>
        </div>

        <div className="flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setActiveView("messages")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "messages" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <MessageSquare className="mr-2 inline-block h-4 w-4" />
            Messages ({localMessages.length})
          </button>
          <button
            onClick={() => setActiveView("subscribers")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "subscribers" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            <User className="mr-2 inline-block h-4 w-4" />
            Subscribers ({visibleSubscribers.length})
          </button>
        </div>
      </div>

      {activeView === "messages" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/40 bg-card p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Send className="h-4 w-4" /> Send News / Announcement
            </h3>
            <div className="grid gap-3 md:grid-cols-4">
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as "subscribers" | "messages" | "both")}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="subscribers">Subscribers</option>
                <option value="messages">Messaged users</option>
                <option value="both">Both groups</option>
              </select>
              <input
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Subject"
                className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-3"
              />
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Write your announcement..."
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-4"
              />
              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={sendBroadcast}
                  disabled={sendingBroadcast}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {sendingBroadcast ? "Sending..." : "Send Broadcast"}
                </button>
              </div>
            </div>
          </div>

          {localMessages.map((msg) => {
            const isPending = Boolean(pendingActionByMessageId[msg.id]);

            return (
              <div
                key={msg.id}
                className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{msg.subject}</h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{msg.name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {msg.email}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(msg.createdAt!).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className={msg.readAt ? "text-emerald-600" : "text-amber-600"}>
                            {msg.readAt ? "Read" : "Unread"}
                          </span>
                          {msg.repliedAt && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">Replied</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex items-center gap-2">
                      <button
                        onClick={() => startReply(msg.id, msg.subject)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Reply className="h-3 w-3" /> Reply
                      </button>
                      <details>
                        <summary className="list-none">
                          <button
                            className="rounded-md border border-border p-2 hover:bg-muted"
                            disabled={isPending}
                          >
                            {isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </button>
                        </summary>
                        <div className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-border bg-background p-1 shadow-lg">
                          {msg.readAt ? (
                            <button
                              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => handleMessageAction(msg.id, "mark-unread")}
                              disabled={isPending}
                            >
                              Mark as unread
                            </button>
                          ) : (
                            <button
                              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => handleMessageAction(msg.id, "mark-read")}
                              disabled={isPending}
                            >
                              Mark as read
                            </button>
                          )}
                          <button
                            className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
                            onClick={() => handleMessageAction(msg.id, "archive")}
                            disabled={isPending}
                          >
                            Archive
                          </button>
                          <button
                            className="w-full rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                            onClick={() => handleMessageAction(msg.id, "delete")}
                            disabled={isPending}
                          >
                            Delete
                          </button>
                        </div>
                      </details>
                    </div>
                  </div>
                  <div className="pl-16">
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {msg.message}
                    </p>
                  </div>



                  <div className="mt-4 flex flex-wrap gap-2 pl-16">
                    <button
                      onClick={() =>
                        handleMessageAction(msg.id, msg.readAt ? "mark-unread" : "mark-read")
                      }
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      disabled={isPending}
                    >
                      {msg.readAt ? "Mark unread" : "Mark read"}
                    </button>
                    <button
                      onClick={() => startReply(msg.id, msg.subject)}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Reply
                    </button>
                    <button
                      onClick={() => handleMessageAction(msg.id, "archive")}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      disabled={isPending}
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleMessageAction(msg.id, "delete")}
                      className="rounded-md border border-destructive px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      disabled={isPending}
                    >
                      Delete
                    </button>
                  </div>
                  {replyTargetId === msg.id && (
                    <div className="mt-4 rounded-md border border-border/40 bg-muted/30 p-4">
                      <h4 className="mb-2 text-sm font-semibold">Reply to {msg.email}</h4>
                      <div className="space-y-2">
                        <input
                          value={replySubject}
                          onChange={(e) => setReplySubject(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Subject"
                        />
                        <textarea
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Write your response..."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setReplyTargetId(null)}
                            className="rounded-md border border-border px-3 py-2 text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={sendReply}
                            disabled={sendingReply}
                            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                          >
                            {sendingReply ? "Sending..." : "Send Reply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {localMessages.length === 0 && (
            <div className="rounded-xl border border-dashed bg-muted/20 py-20 text-center">
              <MessageSquare className="mx-auto mb-4 h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">No messages yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-border/40 bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-sm font-bold">Email Address</th>
                <th className="px-6 py-4 text-sm font-bold">Date Subscribed</th>
                <th className="px-6 py-4 text-sm font-bold">Status</th>
                <th className="px-6 py-4 text-right text-sm font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {visibleSubscribers.map((sub) => (
                <tr key={sub.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 text-primary">
                        <Mail className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{sub.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(sub.createdAt!).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="text-sm font-medium text-destructive hover:underline disabled:opacity-60"
                      onClick={() => handleRemoveSubscriber(sub.id)}
                      disabled={removingSubscriberId === sub.id}
                    >
                      {removingSubscriberId === sub.id ? "Removing..." : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleSubscribers.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-serif text-lg italic text-muted-foreground">
                No subscribers yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
