import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchStats, fetchActivities, fetchCharts } from '../services/dashboard';
import { fetchEmployees } from '../services/employee';
import { 
  Users, MessageSquare, Clock, Cpu, ArrowUpRight, Plus, 
  Sparkles, ShieldCheck, Activity, Calendar 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { dbUser, currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [charts, setCharts] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard datasets on mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, activitiesData, chartsData, employeesData] = await Promise.all([
          fetchStats(),
          fetchActivities(),
          fetchCharts(),
          fetchEmployees()
        ]);
        
        if (statsData.success) setStats(statsData.data);
        if (activitiesData.success) setActivities(activitiesData.data);
        if (chartsData.success) setCharts(chartsData.data);
        if (employeesData.success) setEmployees(employeesData.data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        showToast('Failed to retrieve analytics data from server. Running fallback.', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [showToast]);

  // Card details definitions
  const statCards = [
    { 
      name: 'Active Workers', 
      value: stats?.activeEmployees ?? 0, 
      icon: Users, 
      color: 'text-primary', 
      bg: 'bg-primary/10', 
      desc: 'AI digital workforce count' 
    },
    { 
      name: 'Total Sessions', 
      value: stats?.totalConversations ?? 0, 
      icon: MessageSquare, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      desc: 'All-time employee sessions' 
    },
    { 
      name: 'Avg Response Time', 
      value: stats ? `${stats.avgResponseTime}ms` : '0ms', 
      icon: Clock, 
      color: 'text-amber-500', 
      bg: 'bg-amber-500/10', 
      desc: 'Average inference speed' 
    },
    { 
      name: 'Inference Tokens', 
      value: stats ? stats.tokensUsed.toLocaleString() : '0', 
      icon: Cpu, 
      color: 'text-rose-500', 
      bg: 'bg-rose-500/10', 
      desc: 'AI resource usage tracking' 
    }
  ];

  // Pie chart colors matching the four theme layouts
  const COLORS = ['var(--color-primary)', 'var(--color-accent)', '#e11d48', '#d97706', '#7c3aed'];

  // Skeletons loader UI structure
  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-8 select-none">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-bg-tertiary"></div>
          <div className="h-4 w-96 animate-pulse rounded-lg bg-bg-tertiary"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-2xl border border-border bg-bg-secondary p-6 animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-bg-tertiary rounded-md"></div>
                <div className="h-10 w-10 bg-bg-tertiary rounded-xl"></div>
              </div>
              <div className="h-8 w-16 bg-bg-tertiary rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Charts & Bottom content skeletons */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 h-96 rounded-2xl border border-border bg-bg-secondary animate-pulse"></div>
          <div className="h-96 rounded-2xl border border-border bg-bg-secondary animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="p-6 md:p-8 space-y-8 select-none"
    >
      {/* Dynamic Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-text-primary">
            Welcome, {dbUser?.name || currentUser?.displayName || 'Builder'}!
          </h2>
          <p className="mt-1.5 text-sm text-text-secondary">
            Manage your AI workforce agents and check operations analytics.
          </p>
        </div>

        <button
          onClick={() => navigate('/employees', { state: { openCreateModal: true } })}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-primary/30 transition hover:scale-101 duration-150"
        >
          <Plus className="h-4 w-4" />
          <span>Hire Digital Employee</span>
        </button>
      </div>

      {/* Statistics Cards grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const CardIcon = card.icon;
          return (
            <motion.div
              key={idx}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">{card.name}</span>
                <div className={`rounded-xl p-2.5 ${card.bg} ${card.color}`}>
                  <CardIcon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5">
                <span className="text-3xl font-black text-text-primary tracking-tight">{card.value}</span>
                <p className="mt-1 text-xxs text-text-muted">{card.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Analytics Charts section */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Daily Conversations AreaChart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-extrabold text-text-primary">Conversations Usage History</h3>
            <p className="text-xs text-text-muted">Chat sessions and volume tracking over the last 7 days.</p>
          </div>
          <div className="h-72 w-full">
            {charts?.usageHistory && charts.usageHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.usageHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis 
                    dataKey="date_label" 
                    stroke="var(--color-text-muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--color-text-muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-bg-secondary)', 
                      borderColor: 'var(--color-border)',
                      borderRadius: '12px',
                      color: 'var(--color-text-primary)',
                      fontSize: '12px',
                      fontFamily: 'Outfit'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="conversations" 
                    stroke="var(--color-primary)" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#colorUsage)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-muted">No historical metrics.</div>
            )}
          </div>
        </div>

        {/* Categories Distribution PieChart */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-extrabold text-text-primary">Department Breakdown</h3>
            <p className="text-xs text-text-muted">Active workers mapped by category.</p>
          </div>
          <div className="h-72 w-full flex flex-col justify-between">
            <div className="h-52 w-full">
              {charts?.categoryDistribution && charts.categoryDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {charts.categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-bg-secondary)', 
                        borderColor: 'var(--color-border)',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'Outfit'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-muted">No categories.</div>
              )}
            </div>
            
            {/* Custom Legend for Theme Compatibility */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
              {charts?.categoryDistribution?.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span>{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Employees & Activities log row */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent AI Employees cards */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div>
              <h3 className="text-base font-extrabold text-text-primary">Digital Employees Status</h3>
              <p className="text-xs text-text-muted">Your active workers and category departments.</p>
            </div>
            <Link to="/employees" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
              Manage workforce <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {employees && employees.length > 0 ? (
              employees.slice(0, 4).map((emp) => (
                <div 
                  key={emp.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-bg-primary/40 p-4 transition-all duration-150 hover:border-primary/30"
                >
                  <img 
                    src={emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'} 
                    alt={emp.name} 
                    className="h-11 w-11 rounded-full object-cover border border-border bg-bg-secondary shadow-xs shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-primary truncate">{emp.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-block text-xxs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                        {emp.category}
                      </span>
                      <span className="flex items-center gap-1 text-xxs text-text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl">
                <Sparkles className="h-8 w-8 text-primary/40 mb-3" />
                <p className="text-sm font-bold text-text-secondary">No digital employees created yet.</p>
                <p className="text-xs text-text-muted mt-1">Generate your first digital HR or Sales representative to begin.</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed log */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm flex flex-col">
          <div className="mb-6 shrink-0">
            <h3 className="text-base font-extrabold text-text-primary">Recent Activity Feed</h3>
            <p className="text-xs text-text-muted">System actions and event auditing.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-76 pr-1">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="mt-0.5 rounded-lg bg-bg-primary border border-border p-1.5 shrink-0 flex items-center justify-center h-8 w-8 text-text-muted">
                    <Activity className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary leading-tight truncate">{act.details}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xxs text-text-muted capitalize">{act.action.replace('_', ' ')}</span>
                      <span className="text-xxs text-text-muted">•</span>
                      <span className="text-xxs text-text-muted flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-12 text-text-muted">
                <Activity className="h-7 w-7 text-text-muted/40 mb-2" />
                <p className="text-xs font-bold">No activity logs recorded.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
