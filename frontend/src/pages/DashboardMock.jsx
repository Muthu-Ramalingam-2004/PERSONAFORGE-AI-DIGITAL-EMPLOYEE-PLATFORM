import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, LayoutDashboard, Sparkles, Plus, Users, Clock, MessageSquare } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const DashboardMock = () => {
  const { dbUser, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const mockStats = [
    { name: 'Active Employees', value: '0', icon: Users, change: '+0 this month' },
    { name: 'Total Chats', value: '0', icon: MessageSquare, change: '+0 this week' },
    { name: 'Response Time', value: '0ms', icon: Clock, change: '0% change' }
  ];

  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Sidebar Navigation */}
      <aside className="w-64 shrink-0 border-r border-border bg-bg-secondary p-6 hidden md:block">
        <div className="flex items-center gap-2 font-black text-xl text-primary">
          <Sparkles className="h-6 w-6" />
          <span>PersonaForge AI</span>
        </div>

        <nav className="mt-8 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition"
          >
            <User className="h-5 w-5" />
            <span>Profile Settings</span>
          </Link>
        </nav>

        <div className="absolute bottom-6 w-52">
          <button
            onClick={handleLogoutClick}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-bg-secondary px-6">
          <div className="flex items-center gap-2 md:hidden">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-black text-lg text-primary">PersonaForge</span>
          </div>

          <div className="hidden md:block text-sm text-text-muted">
            Workspace: <span className="font-bold text-text-secondary">Default Organization</span>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white uppercase">
                {currentUser?.email?.substring(0, 2) || 'US'}
              </div>
              <span className="text-sm font-bold text-text-primary hidden sm:inline">
                {dbUser?.name || currentUser?.displayName || 'User'}
              </span>
            </Link>
            <button
              onClick={handleLogoutClick}
              className="rounded-lg p-2 text-text-muted hover:bg-bg-tertiary hover:text-red-500 transition md:hidden"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                Good day, {dbUser?.name || currentUser?.displayName || 'User'}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Here is the current operational overview of your AI employees.
              </p>
            </div>

            <button
              onClick={() => navigate('/employees', { state: { openCreateModal: true } })}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-primary/30 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create Employee</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {mockStats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-text-muted">{stat.name}</span>
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-text-primary">{stat.value}</span>
                    <span className="ml-2 text-xs font-medium text-emerald-500">{stat.change}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Setup Callout */}
          <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-bg-secondary/40">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-text-primary">Ready to deploy your digital workers?</h3>
            <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
              Your authentication module is active and verified. The dashboard, statistics, and AI employee directory are now fully active and unlocked!
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link
                to="/profile"
                className="rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-bg-tertiary transition"
              >
                Configure Settings
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardMock;
