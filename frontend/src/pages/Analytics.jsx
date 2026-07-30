import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchCharts, fetchStats } from '../services/dashboard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { BarChart3, Clock, Cpu, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Analytics = () => {
  const { showToast } = useToast();
  const [charts, setCharts] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const [chartsData, statsData] = await Promise.all([
          fetchCharts(),
          fetchStats()
        ]);
        if (chartsData.success) setCharts(chartsData.data);
        if (statsData.success) setStats(statsData.data);
      } catch (error) {
        showToast('Failed to load analytical timelines.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [showToast]);

  const COLORS = ['var(--color-primary)', 'var(--color-accent)', '#e11d48', '#d97706', '#7c3aed'];

  const customTooltipStyle = {
    backgroundColor: 'var(--color-bg-secondary)',
    borderColor: 'var(--color-border)',
    borderRadius: '12px',
    color: 'var(--color-text-primary)',
    fontFamily: 'Outfit',
    fontSize: '12px'
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Chats Run', value: stats?.totalConversations ?? 0, icon: MessageSquare, label: 'Chat sessions count' },
    { name: 'Cumulative Tokens', value: stats?.tokensUsed ?? 0, icon: Cpu, label: 'Tokens consumed' },
    { name: 'Avg Turn Response', value: `${stats?.avgResponseTime ?? 0}ms`, icon: Clock, label: 'AI generation speed' }
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 select-none">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">System Analytics</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Monitor your organization's AI employee token usage and request speed audit charts.
        </p>
      </div>

      {/* Cards summary */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{card.name}</span>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-text-primary tracking-tight">{card.value.toLocaleString()}</span>
                <span className="block text-xxs text-text-muted mt-1">{card.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart grids */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Token timeline charts */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-extrabold text-text-primary">Token Consumption Trend</h3>
            <p className="text-xs text-text-muted">Dynamic inference token volumes used daily.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts?.usageHistory || []}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date_label" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Area type="monotone" dataKey="tokens" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inference response time daily bar chart */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-extrabold text-text-primary">Daily Communication Output</h3>
            <p className="text-xs text-text-muted">Comparison of overall chat session volume.</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.usageHistory || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date_label" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Bar dataKey="conversations" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
