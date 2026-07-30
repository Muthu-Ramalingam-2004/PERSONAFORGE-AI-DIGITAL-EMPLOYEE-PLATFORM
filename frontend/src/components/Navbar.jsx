import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Waves, Trees, ChevronDown, User, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ onMobileToggle }) => {
  const { dbUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard Overview';
      case '/profile': return 'Profile Settings';
      default: return 'PersonaForge AI';
    }
  };

  const themeOptions = [
    { id: 'light', name: 'Light Theme', icon: Sun, color: 'text-amber-500' },
    { id: 'dark', name: 'Dark Theme', icon: Moon, color: 'text-indigo-400' },
    { id: 'ocean', name: 'Ocean Theme', icon: Waves, color: 'text-cyan-400' },
    { id: 'nature', name: 'Nature Theme', icon: Trees, color: 'text-emerald-400' }
  ];

  const currentThemeOpt = themeOptions.find(t => t.id === theme) || themeOptions[1];
  const CurrentIcon = currentThemeOpt.icon;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-bg-secondary px-6 shrink-0 relative z-30 select-none">
      {/* Page Title & Mobile Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMobileToggle}
          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition md:hidden"
        >
          <Menu className="h-5.5 w-5.5" />
        </button>

        <h1 className="text-lg font-bold text-text-primary hidden sm:block">
          {getPageTitle()}
        </h1>

        <div className="flex items-center gap-1.5 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white shrink-0">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <span className="font-extrabold text-sm text-primary tracking-tight">PersonaForge</span>
        </div>
      </div>

      {/* Utilities panel */}
      <div className="flex items-center gap-4">
        {/* Dynamic Theme switching selector dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-border bg-bg-primary px-3.5 py-1.8 text-xs font-semibold text-text-secondary hover:text-text-primary hover:border-primary/50 transition duration-150"
          >
            <CurrentIcon className={`h-4 w-4 ${currentThemeOpt.color}`} />
            <span className="hidden md:inline capitalize">{theme} Theme</span>
            <ChevronDown className="h-3 w-3 text-text-muted" />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <>
                {/* Click outside backdrop close layer */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setDropdownOpen(false)}
                />
                
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-bg-secondary p-1.5 shadow-xl z-20"
                >
                  {themeOptions.map((opt) => {
                    const OptIcon = opt.icon;
                    const isSelected = theme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setTheme(opt.id);
                          setDropdownOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                        }`}
                      >
                        <OptIcon className={`h-4 w-4 ${opt.color}`} />
                        <span>{opt.name}</span>
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User badge */}
        <Link to="/profile" className="flex items-center gap-2 hover:opacity-85 transition shrink-0">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-primary/10 text-primary font-black uppercase text-xs">
            {dbUser?.name?.substring(0, 2) || 'U'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-bold text-text-primary max-w-28 truncate">{dbUser?.name || 'User'}</p>
            <p className="text-xxs text-text-muted capitalize">{dbUser?.subscription_plan || 'free'} plan</p>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
