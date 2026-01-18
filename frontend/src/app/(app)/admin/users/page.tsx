"use client";

import { useState, useEffect, useCallback } from "react";
import { User, getToken } from "@/lib/auth";

type UserStatus = "pending" | "active" | "inactive" | "rejected";

const statusColors: Record<UserStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  inactive: "bg-zinc-100 text-zinc-800",
  rejected: "bg-red-100 text-red-800",
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const token = getToken();
    
    try {
      const url = statusFilter === "all" 
        ? "/api/admin/users" 
        : `/api/admin/users?status=${statusFilter}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          setError("Admin access required");
        } else {
          setError("Failed to fetch users");
        }
        return;
      }
      
      const data = await res.json();
      setUsers(data);
    } catch {
      setError("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (userId: string, action: "approve" | "reject" | "activate" | "deactivate") => {
    setActionLoading(userId);
    const token = getToken();
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const data = await res.json();
        alert(data.detail || `Failed to ${action} user`);
        return;
      }
      
      await fetchUsers();
    } catch {
      alert(`Failed to ${action} user`);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = users.filter(u => u.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">User Management</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage user accounts and approvals
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
            {pendingCount} pending approval{pendingCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zinc-700">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-zinc-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">No users found</div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Registered
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-zinc-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900">
                      {user.display_name || user.email}
                    </div>
                    <div className="text-sm text-zinc-500">{user.email}</div>
                    {user.mobile && (
                      <div className="text-xs text-zinc-400">{user.mobile}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[user.status as UserStatus]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {user.role}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {user.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAction(user.id, "approve")}
                            disabled={actionLoading === user.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(user.id, "reject")}
                            disabled={actionLoading === user.id}
                            className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {user.status === "active" && user.role !== "admin" && (
                        <button
                          onClick={() => handleAction(user.id, "deactivate")}
                          disabled={actionLoading === user.id}
                          className="rounded px-2 py-1 text-xs font-medium bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      )}
                      {(user.status === "inactive" || user.status === "rejected") && (
                        <button
                          onClick={() => handleAction(user.id, "activate")}
                          disabled={actionLoading === user.id}
                          className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
