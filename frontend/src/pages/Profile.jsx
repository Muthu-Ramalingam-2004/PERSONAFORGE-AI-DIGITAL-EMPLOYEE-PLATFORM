import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, Mail, Shield, Save, CheckCircle2, AlertCircle, Sun, Moon, Waves, Trees, Key } from 'lucide-react';
import { motion } from 'framer-motion';

const Profile = () => {
  const { currentUser, dbUser, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(dbUser?.name || currentUser?.displayName || '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    
    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile(name);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const themeOptions = [
    { id: 'light', name: 'Light Mode', icon: Sun, bg: 'bg-white border-slate-200 text-slate-900', preview: 'bg-slate-100' },
    { id: 'dark', name: 'Dark Mode', icon: Moon, bg: 'bg-zinc-950 border-zinc-800 text-zinc-50', preview: 'bg-zinc-900' },
    { id: 'ocean', name: 'Ocean Breeze', icon: Waves, bg: 'bg-[#0b1528] border-slate-800 text-[#f1f5f9]', preview: 'bg-[#112240]' },
    { id: 'nature', name: 'Forest Green', icon: Trees, bg: 'bg-[#0c1814] border-[#162e26] text-[#f0fdf4]', preview: 'bg-[#142a22]' }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Profile Settings</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Configure your user details, custom display preferences, and credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Navigation Sidebar/Quick Info */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-10 w-10" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-text-primary">
                {dbUser?.name || currentUser?.displayName || 'PersonaForge User'}
              </h2>
              <p className="text-xs text-text-muted mt-1 truncate max-w-full">
                {currentUser?.email}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Shield className="h-3 w-3" />
                <span>{dbUser?.role ? dbUser.role.toUpperCase() : 'USER'}</span>
              </div>
            </div>

            <hr className="my-6 border-border" />

            <div className="space-y-4">
              <div>
                <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Subscription</span>
                <span className="mt-1 block text-sm font-bold text-text-primary capitalize">
                  {dbUser?.subscription_plan || 'Free Trial'} Plan
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Member Since</span>
                <span className="mt-1 block text-sm text-text-secondary">
                  {dbUser?.created_at ? new Date(dbUser.created_at).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="space-y-8 md:col-span-2">
          {/* Profile form */}
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
            <h3 className="text-lg font-bold text-text-primary mb-6">Personal Details</h3>

            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-3 rounded-lg bg-emerald-500/10 p-4 text-sm text-emerald-500 border border-emerald-500/20"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div>{success}</div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-3 rounded-lg bg-red-500/10 p-4 text-sm text-red-500 border border-red-500/20"
              >
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Full Name</label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-bg-primary py-2.5 pl-10 pr-3 text-text-primary placeholder-text-muted transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary">Email Address</label>
                  <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      disabled
                      value={currentUser?.email || ''}
                      className="block w-full rounded-xl border border-border bg-bg-primary/50 py-2.5 pl-10 pr-3 text-text-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary">Firebase User ID (UID)</label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                    <Key className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={currentUser?.uid || ''}
                    className="block w-full rounded-xl border border-border bg-bg-primary/50 py-2.5 pl-10 pr-3 text-text-muted font-mono text-xs cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-primary/30 transition disabled:opacity-75"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Details
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Theme switching block */}
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
            <h3 className="text-lg font-bold text-text-primary mb-2">Display Preferences</h3>
            <p className="text-xs text-text-secondary mb-6">Choose your workspace theme layout.</p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {themeOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={`flex flex-col items-center justify-between rounded-xl border p-4 transition-all duration-200 ${opt.bg} ${
                      isSelected 
                        ? 'border-primary ring-2 ring-primary/20 scale-102 font-bold shadow-md' 
                        : 'border-border opacity-70 hover:opacity-100 hover:scale-101'
                    }`}
                  >
                    <IconComponent className="h-6 w-6 text-primary mb-3" />
                    <span className="text-xs font-semibold text-center mt-1">{opt.name}</span>
                    <div className="mt-3 flex w-full gap-1 rounded-md p-1 bg-black/10">
                      <div className={`h-3 w-3 rounded-full ${opt.preview}`}></div>
                      <div className="h-3 w-3 rounded-full bg-primary"></div>
                      <div className="h-3 w-3 rounded-full bg-accent"></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
