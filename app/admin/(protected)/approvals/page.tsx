"use client";

import { useEffect, useState } from "react";
import { UserCheck, UserX, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

type AdminUserItem = {
  id: string;
  username: string;
  email: string;
  role: string;
  approved: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
};

export default function AdminApprovalsPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      toast.error("Could not load users list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (userId: string) => {
    setActionUserId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to approve user");

      toast.success("User registration approved!");
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setActionUserId(null);
    }
  };

  const handleToggleSuperAdmin = async (userId: string) => {
    setActionUserId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "toggle_super" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to toggle role");

      toast.success("User privilege status updated");
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Privilege toggle failed");
    } finally {
      setActionUserId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to reject or remove this user account?")) return;
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete user");

      toast.success("User request rejected/deleted");
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Deletion failed");
    } finally {
      setActionUserId(null);
    }
  };

  const pendingUsers = users.filter((u) => !u.approved);
  const approvedUsers = users.filter((u) => u.approved);

  if (isLoading) return <div className="p-20 text-center text-muted-foreground">Loading approvals...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="mb-2 font-serif text-2xl font-bold">Admin Approvals & Users</h1>
        <p className="text-muted-foreground">
          Manage admin access requests and toggle super-admin status.
        </p>
      </div>

      <div className="space-y-6">
        {/* Pending Section */}
        <section className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
            <ShieldAlert className="h-5 w-5" /> Pending Access Requests ({pendingUsers.length})
          </h3>
          <div className="space-y-3">
            {pendingUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No pending registration requests.</p>
            ) : (
              pendingUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border/40 p-4 transition-colors hover:bg-muted/30">
                  <div>
                    <p className="font-semibold text-sm">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Requested on: {new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={actionUserId !== null}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60"
                    >
                      {actionUserId === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={actionUserId !== null}
                      className="inline-flex items-center gap-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive/10 text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Approved Section */}
        <section className="space-y-4 rounded-xl border border-border/40 bg-card p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" /> Approved Administrators ({approvedUsers.length})
          </h3>
          <div className="space-y-3">
            {approvedUsers.map((user) => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border/40 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{user.username}</p>
                    {user.isSuperAdmin && (
                      <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        Super Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Created: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleSuperAdmin(user.id)}
                    disabled={actionUserId !== null || user.email === "admin@university.edu"}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border hover:bg-muted text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60"
                    title={user.email === "admin@university.edu" ? "Cannot change default super admin" : ""}
                  >
                    {user.isSuperAdmin ? "Demote" : "Promote to Super"}
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={actionUserId !== null || user.email === "admin@university.edu"}
                    className="inline-flex items-center gap-1.5 rounded-md text-destructive hover:bg-destructive/10 text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-60"
                    title={user.email === "admin@university.edu" ? "Cannot delete default admin" : ""}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
