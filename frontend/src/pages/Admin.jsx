import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchAdminStats, fetchAdminUsers, updateAdminUserPlan, fetchAdminLogs } from '../services/admin';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Users, Calendar, ShieldCheck, 
  Settings, Key, Activity, TrendingUp 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Admin = () => {
  const { dbUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Checks admin authorization
  useEffect(() => {
    if (dbUser && dbUser.role !== 'admin') {
      showToast('Unauthorized: Admin access only.', 'error');
      navigate('/dashboard');
    }
  }, [dbUser, navigate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, logsRes] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminLogs()
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (usersRes.success) setUsers(usersRes.data);
      if (logsRes.success) setLogs(logsRes.data);
    } catch (error) {
      showToast('Failed to fetch administrative feeds.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dbUser?.role === 'admin') {
      loadAdminData();
    }
  }, [dbUser]);

  const handleUpdatePlan = async (userId, currentPlan, currentRole, field, value) => {
    try {
      const plan = field === 'plan' ? value : currentPlan;
      const role = field === 'role' ? value : currentRole;

      const res = await updateAdminUserPlan(userId, plan, role);
      if (res.success) {
        showToast('User permissions modified successfully!', 'success');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_plan: plan, role } : u));
      }
    } catch (error) {
      showToast('Failed to update user profile.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Platform Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-primary' },
    { name: 'Deployed AI Workers', value: stats?.totalEmployees ?? 0, icon: Settings, color: 'text-accent' },
    { name: 'Total Inference Runs', value: stats?.totalChats ?? 0, icon: Activity, color: 'text-rose-500' },
    { name: 'Platform Tokens Pool', value: stats?.totalTokensUsed?.toLocaleString() ?? 0, icon: TrendingUp, color: 'text-amber-500' }
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 select-none">
      {/* Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-primary" />
          <span>System Administration</span>
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Monitor multi-tenant operations, change workspace tiers, and review global audit events.
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{card.name}</span>
                <div className={`rounded-xl p-2.5 bg-primary/10 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-text-primary tracking-tight">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Users management & audit logs */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Users lists table */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm flex flex-col min-w-0">
          <h3 className="text-base font-extrabold text-text-primary mb-6">User Accounts Directory</h3>

          <div className="overflow-x-auto min-w-full">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-text-muted font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 px-4">Tier Plan</th>
                  <th className="pb-3 px-4">Permission</th>
                  <th className="pb-3 pl-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => (
                  <tr key={user.id} className="text-text-secondary">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-text-primary truncate max-w-44">{user.name || 'Anonymous'}</div>
                      <div className="text-xxs text-text-muted mt-0.5 truncate max-w-44 select-all">{user.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={user.subscription_plan}
                        onChange={(e) => handleUpdatePlan(user.id, user.subscription_plan, user.role, 'plan', e.target.value)}
                        className="bg-bg-primary border border-border rounded-lg py-1 px-2 text-xxs font-semibold text-text-primary focus:outline-none focus:border-primary transition"
                      >
                        <option value="free">Free Tier</option>
                        <option value="pro">Pro Scale</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdatePlan(user.id, user.subscription_plan, user.role, 'role', e.target.value)}
                        className="bg-bg-primary border border-border rounded-lg py-1 px-2 text-xxs font-semibold text-text-primary focus:outline-none focus:border-primary transition"
                      >
                        <option value="user">User</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td className="py-3 pl-4 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global audit logging feed */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="text-base font-extrabold text-text-primary flex items-center gap-1.5">
              <Activity className="h-4.5 w-4.5 text-primary" />
              <span>Global Audit Trail</span>
            </h3>
            <p className="text-xs text-text-muted">Platform-wide trace logs auditing.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-96 pr-1">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2.5 pb-2.5 border-b border-border/40 last:border-b-0">
                  <div className="mt-0.5 rounded-lg bg-bg-primary p-1 shrink-0 flex items-center justify-center h-7 w-7 text-text-muted border border-border">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary leading-tight line-clamp-2">{log.details}</p>
                    <p className="text-xxs text-text-muted mt-1 truncate max-w-full leading-none">
                      Run by: <span className="font-semibold text-text-secondary select-all">{log.user_email}</span>
                    </p>
                    <span className="inline-block text-xxs text-text-muted mt-1 select-none">
                      {new Date(log.created_at).toLocaleDateString()} at {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-xs text-text-muted">
                No platform activity logs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
