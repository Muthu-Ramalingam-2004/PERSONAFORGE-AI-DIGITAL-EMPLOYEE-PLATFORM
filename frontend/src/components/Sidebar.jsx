import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useEmployee } from '../context/EmployeeContext';
import { 
  LayoutDashboard, Users, MessageSquare, BookOpen, Terminal, 
  Cpu, BarChart3, Settings, ShieldAlert, User, LogOut, 
  Sparkles, ChevronLeft, ChevronRight, Menu 
} from 'lucide-react';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { dbUser, logout } = useAuth();
  const { showToast } = useToast();
  const { selectedEmployee, setIsSelectionModalOpen } = useEmployee();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Signed out successfully', 'success');
      navigate('/login');
    } catch (err) {
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Employees', path: '/employees', icon: Users },
    { name: 'AI Chat', path: '/chat', icon: MessageSquare },
    { name: 'Knowledge Base', path: selectedEmployee ? `/knowledge-base/${selectedEmployee.id}` : '/knowledge-base', icon: BookOpen },
    { name: 'Prompt Manager', path: selectedEmployee ? `/prompt-manager/${selectedEmployee.id}` : '/prompt-manager', icon: Terminal },
    { name: 'Workflow Automation', path: '/workflows', icon: Cpu },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Admin link appears only if role is admin
  if (dbUser?.role === 'admin') {
    navItems.push({ name: 'Admin Panel', path: '/admin', icon: ShieldAlert });
  }

  const handleItemClick = (item, e) => {
    if (item.name === 'Knowledge Base' || item.name === 'Prompt Manager') {
      if (!selectedEmployee) {
        if (e) e.preventDefault();
        setIsSelectionModalOpen(true);
        return;
      }
    }
    setIsMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-bg-secondary border-r border-border transition-all duration-300">
      {/* Brand Logo header */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5 hover:opacity-85 transition select-none">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 shrink-0">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <span className="font-black text-lg tracking-tight text-primary transition-opacity duration-300">
              PersonaForge
            </span>
          )}
        </Link>

        {/* Collapse Button (desktop only) */}
        {!isMobileOpen && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-border bg-bg-primary text-text-muted hover:text-text-primary transition shrink-0"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            (item.name === 'Knowledge Base' && location.pathname.startsWith('/knowledge-base')) ||
            (item.name === 'Prompt Manager' && location.pathname.startsWith('/prompt-manager')) ||
            (location.pathname === item.path);
          const isButtonLink = item.disabled;

          const linkClass = `flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 select-none ${
            isActive
              ? 'bg-primary text-white shadow-lg shadow-primary/15'
              : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
          } ${item.disabled ? 'opacity-60 cursor-pointer' : ''}`;

          if (isButtonLink) {
            return (
              <div
                key={item.name}
                onClick={(e) => handleItemClick(item, e)}
                className={linkClass}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {(!isCollapsed || isMobileOpen) && <span>{item.name}</span>}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={(e) => handleItemClick(item, e)}
              className={linkClass}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Profile & Logout footer section */}
      <div className="p-4 border-t border-border shrink-0">
        <Link
          to="/profile"
          onClick={() => setIsMobileOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition text-text-secondary hover:bg-bg-tertiary hover:text-text-primary ${
            location.pathname === '/profile' ? 'bg-primary/10 text-primary font-bold' : ''
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0 uppercase font-black text-sm">
            {dbUser?.name?.substring(0, 2) || 'U'}
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{dbUser?.name || 'User'}</p>
              <p className="text-xxs text-text-muted truncate select-all">{dbUser?.email}</p>
            </div>
          )}
        </Link>

        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-500/10 transition"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!isCollapsed || isMobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar drawer */}
      <aside className={`hidden md:block shrink-0 h-screen transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Slide Panel overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
        >
          <aside 
            className="fixed inset-y-0 left-0 z-50 w-64 h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
