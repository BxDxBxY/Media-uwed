"use client";

import { useGlobalContext } from "@/lib/context";
import { Mail, MessageSquare, User, Calendar, CheckCircle2, MoreHorizontal, Inbox, Loader2, Send, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PrefMap = Record<string, boolean>;

export default function AdminConnectionsPage() {
  const { subscribers, messages, isLoading, deleteSubscriber } = useGlobalContext();
  const [activeView, setActiveView] = useState<"messages" | "subscribers">("messages");
  const [removingSubscriberId, setRemovingSubscriberId] = useState<string | null>(null);
  const [pendingActionByMessageId, setPendingActionByMessageId] = useState<Record<string, string>>({});
  const [hiddenSubscriberIds, setHiddenSubscriberIds] = useState<Set<string>>(new Set());
  const [localMessages, setLocalMessages] = useState(messages);

  const [outreachMode, setOutreachMode] = useState<"subscribers" | "messages" | "single">("subscribers");
  const [outreachEmail, setOutreachEmail] = useState("");
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachMessage, setOutreachMessage] = useState("");
  const [sendingOutreach, setSendingOutreach] = useState(false);
  const [subscriberPrefs, setSubscriberPrefs] = useState<PrefMap>({});
  const [prefSavingEmail, setPrefSavingEmail] = useState<string | null>(null);

  useEffect(() => setLocalMessages(messages), [messages]);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const response = await fetch("/api/admin/subscribers/preferences");
        if (!response.ok) return;
        const data = await response.json();
        setSubscriberPrefs(data.preferences || {});
      } catch {
        // noop
      }
    };
    fetchPrefs();
  }, []);

  const visibleSubscribers = useMemo(() => subscribers.filter((sub) => !hiddenSubscriberIds.has(sub.id)), [subscribers, hiddenSubscriberIds]);
  const messageEmails = useMemo(() => [...new Set(localMessages.map((m) => m.email).filter(Boolean))], [localMessages]);

  const isSubscriberActive = (email: string) => subscriberPrefs[email.toLowerCase()] !== false;

  const updateSubscriberPreference = async (email: string, active: boolean) => {
    setPrefSavingEmail(email);
    try {
      const response = await fetch("/api/admin/subscribers/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, active }),
      });
      if (!response.ok) throw new Error();
      setSubscriberPrefs((prev) => ({ ...prev, [email.toLowerCase()]: active }));
      toast.success(active ? "Subscriber activated for newsletters" : "Subscriber paused from newsletters");
    } catch {
      toast.error("Failed to update subscriber preference");
    } finally {
      setPrefSavingEmail(null);
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

  const handleMessageAction = async (messageId: string, action: "delete" | "archive" | "mark-read") => {
    const previousMessages = localMessages;
    setPendingActionByMessageId((prev) => ({ ...prev, [messageId]: action }));

    if (action === "delete" || action === "archive") {
      setLocalMessages((prev) => prev.filter((message) => message.id !== messageId));
    } else {
      setLocalMessages((prev) => prev.map((message) => (message.id === messageId ? { ...message, readAt: message.readAt || new Date().toISOString() } : message)));
    }

    try {
      const endpoint = action === "delete" ? `/api/admin/messages/${messageId}` : action === "archive" ? `/api/admin/messages/${messageId}/archive` : `/api/admin/messages/${messageId}/read`;
      const method = action === "delete" ? "DELETE" : "PATCH";
      const response = await fetch(endpoint, { method });
      if (!response.ok) throw new Error("Request failed");
      toast.success(action === "delete" ? "Message deleted" : action === "archive" ? "Message archived" : "Message marked as read");
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

  const sendOutreach = async () => {
    if (!outreachSubject.trim() || !outreachMessage.trim()) {
      toast.error("Please add subject and message");
      return;
    }

    if (outreachMode === "single" && !outreachEmail.trim()) {
      toast.error("Please provide recipient email");
      return;
    }

    setSendingOutreach(true);
    try {
      const response = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: outreachMode, recipientEmail: outreachEmail, subject: outreachSubject, message: outreachMessage }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Send failed");

      if (data.sent) {
        toast.success(`Newsletter sent to ${data.recipientCount} recipients`);
      } else {
        toast.warning(`Email provider not configured. Request logged for ${data.recipientCount} recipients.`);
      }

      setOutreachSubject("");
      setOutreachMessage("");
      setOutreachEmail("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send newsletter");
    } finally {
      setSendingOutreach(false);
    }
  };

  if (isLoading) return <div className="p-20 text-center">Loading connections...</div>;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
        <h2 className="text-xl font-bold">Outreach & Newsletter</h2>
        <p className="text-sm text-muted-foreground">Send updates to all subscribers, users who sent messages, or a single recipient.</p>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <div>To enable real sending set <span className="font-mono">RESEND_API_KEY</span> and <span className="font-mono">RESEND_FROM_EMAIL</span> in your deployment environment. Without them requests are logged only.</div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <select value={outreachMode} onChange={(e) => setOutreachMode(e.target.value as "subscribers" | "messages" | "single")} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="subscribers">All active subscribers</option>
            <option value="messages">All message senders</option>
            <option value="single">Single email</option>
          </select>
          {outreachMode === "single" ? (
            <select value={outreachEmail} onChange={(e) => setOutreachEmail(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select email from messages</option>
              {messageEmails.map((email) => <option key={email} value={email}>{email}</option>)}
            </select>
          ) : null}
          <input value={outreachSubject} onChange={(e) => setOutreachSubject(e.target.value)} placeholder="Subject" className="rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
        </div>
        <textarea value={outreachMessage} onChange={(e) => setOutreachMessage(e.target.value)} rows={4} placeholder="Write your newsletter / response here..." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={sendOutreach} disabled={sendingOutreach} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {sendingOutreach ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
        </button>
      </div>

      <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Connections Hub</h1>
          <p className="mt-1 text-muted-foreground">Manage your audience and inquiries in one place.</p>
        </div>

        <div className="flex rounded-lg bg-muted p-1">
          <button onClick={() => setActiveView("messages")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "messages" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            <MessageSquare className="mr-2 inline-block h-4 w-4" /> Messages ({localMessages.length})
          </button>
          <button onClick={() => setActiveView("subscribers")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === "subscribers" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
            <User className="mr-2 inline-block h-4 w-4" /> Subscribers ({visibleSubscribers.length})
          </button>
        </div>
      </div>

      {activeView === "messages" ? (
        <div className="space-y-4">
          {localMessages.map((msg) => {
            const isPending = Boolean(pendingActionByMessageId[msg.id]);
            return (
              <div key={msg.id} className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Inbox className="h-6 w-6" /></div>
                      <div>
                        <h3 className="text-lg font-bold">{msg.subject}</h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground">{msg.name}</span><span>•</span><span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {msg.email}</span><span>•</span><span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(msg.createdAt!).toLocaleDateString()}</span>
                          {msg.readAt && <><span>•</span><span className="text-emerald-600">Read</span></>}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <details>
                        <summary className="list-none"><button className="rounded-md border border-border p-2 hover:bg-muted" disabled={isPending}>{isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}</button></summary>
                        <div className="absolute right-0 z-10 mt-2 w-36 rounded-md border border-border bg-background p-1 shadow-lg">
                          <button className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => handleMessageAction(msg.id, "mark-read")} disabled={isPending || Boolean(msg.readAt)}>Mark as read</button>
                          <button className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => handleMessageAction(msg.id, "archive")} disabled={isPending}>Archive</button>
                          <button className="w-full rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted" onClick={() => handleMessageAction(msg.id, "delete")} disabled={isPending}>Delete</button>
                        </div>
                      </details>
                    </div>
                  </div>
                  <div className="pl-16"><p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">{msg.message}</p></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm">
          <table className="w-full text-left">
            <thead className="border-b border-border/40 bg-muted/50"><tr><th className="px-6 py-4 text-sm font-bold">Email Address</th><th className="px-6 py-4 text-sm font-bold">Date Subscribed</th><th className="px-6 py-4 text-sm font-bold">Status</th><th className="px-6 py-4 text-right text-sm font-bold">Actions</th></tr></thead>
            <tbody className="divide-y divide-border/40">
              {visibleSubscribers.map((sub) => {
                const active = isSubscriberActive(sub.email);
                return (
                  <tr key={sub.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/5 text-primary"><Mail className="h-4 w-4" /></div><span className="font-medium">{sub.email}</span></div></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(sub.createdAt!).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button
                        disabled={prefSavingEmail === sub.email}
                        onClick={() => updateSubscriberPreference(sub.email, !active)}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"}`}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {prefSavingEmail === sub.email ? "Saving..." : active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right"><button className="text-sm font-medium text-destructive hover:underline disabled:opacity-60" onClick={() => handleRemoveSubscriber(sub.id)} disabled={removingSubscriberId === sub.id}>{removingSubscriberId === sub.id ? "Removing..." : "Remove"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
