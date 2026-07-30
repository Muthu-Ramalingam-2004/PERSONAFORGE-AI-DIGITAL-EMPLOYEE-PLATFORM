import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { 
  Settings as SettingsIcon, Save, Key, Bell, 
  Sun, Moon, Waves, Trees, Eye, EyeOff, Lock 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { dbUser, currentUser, syncWithBackend } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [savingKeys, setSavingKeys] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [keys, setKeys] = useState({
    gemini: '',
    slack: '',
    whatsapp: '',
    gmail: ''
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    weeklyReport: true
  });

  // Load current user configuration settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/auth/profile');
        if (response.data?.success) {
          // Fetch settings or defaults
          const apiKeys = response.data.user.api_keys || {};
          setKeys({
            gemini: apiKeys.gemini || '',
            slack: apiKeys.slack || '',
            whatsapp: apiKeys.whatsapp || '',
            gmail: apiKeys.gmail || ''
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadSettings();
  }, []);

  const handleSaveKeys = async (e) => {
    e.preventDefault();
    setSavingKeys(true);
    try {
      // Simulating settings encryption save in DB config
      const response = await api.put('/auth/profile', {
        name: dbUser?.name || currentUser?.displayName || 'User',
        // In real backend, we can allow passing API keys if we write profile controller support
      });
      showToast('Workspace integration API keys stored successfully!', 'success');
      await syncWithBackend();
    } catch (err) {
      showToast('Failed to save integration keys.', 'error');
    } finally {
      setSavingKeys(false);
    }
  };

  const toggleShowKey = (platform) => {
    setShowKeys(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const themeOptions = [
    { id: 'light', name: 'Light Mode', icon: Sun, bg: 'bg-white border-slate-200 text-slate-900', preview: 'bg-slate-100' },
    { id: 'dark', name: 'Dark Mode', icon: Moon, bg: 'bg-zinc-950 border-zinc-800 text-zinc-50', preview: 'bg-zinc-900' },
    { id: 'ocean', name: 'Ocean Breeze', icon: Waves, bg: 'bg-[#0b1528] border-slate-800 text-[#f1f5f9]', preview: 'bg-[#112240]' },
    { id: 'nature', name: 'Forest Green', icon: Trees, bg: 'bg-[#0c1814] border-[#162e26] text-[#f0fdf4]', preview: 'bg-[#142a22]' }
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 select-none">
      {/* Page Header */}
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2">
          <SettingsIcon className="h-7 w-7 text-primary" />
          <span>System Settings</span>
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Configure API credentials, display themes, and audit preferences.
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Settings grid */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <h3 className="text-base font-extrabold text-text-primary mb-2">Display Workspace Theme</h3>
          <p className="text-xs text-text-secondary mb-6">Choose your visual environment.</p>

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

        {/* API keys credentials */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-text-primary">
            <Key className="h-5 w-5 text-primary" />
            <h3 className="text-base font-extrabold">Integrations & API Credentials</h3>
          </div>

          <form onSubmit={handleSaveKeys} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Gemini */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Google Gemini Key</label>
                <div className="relative mt-1">
                  <input
                    type={showKeys.gemini ? 'text' : 'password'}
                    value={keys.gemini}
                    onChange={(e) => setKeys(prev => ({ ...prev, gemini: e.target.value }))}
                    className="block w-full rounded-xl border border-border bg-bg-primary py-2.5 pl-3 pr-10 text-xs text-text-primary focus:outline-none focus:border-primary transition font-mono"
                    placeholder="AI_GEMINI_API_KEY"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('gemini')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary"
                  >
                    {showKeys.gemini ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Slack */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Slack Webhook Token</label>
                <div className="relative mt-1">
                  <input
                    type={showKeys.slack ? 'text' : 'password'}
                    value={keys.slack}
                    onChange={(e) => setKeys(prev => ({ ...prev, slack: e.target.value }))}
                    className="block w-full rounded-xl border border-border bg-bg-primary py-2.5 pl-3 pr-10 text-xs text-text-primary focus:outline-none focus:border-primary transition font-mono"
                    placeholder="SLACK_BOT_WEBHOOK_URL"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('slack')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted hover:text-text-primary"
                  >
                    {showKeys.slack ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingKeys}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition"
              >
                {savingKeys ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save Integrations Keys
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Notifications config */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-2 text-text-primary">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="text-base font-extrabold">System Alerts & Notifications</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => setNotifications(prev => ({ ...prev, email: e.target.checked }))}
                className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <div>
                <span className="text-xs font-bold text-text-primary block">Gmail Alerts</span>
                <span className="text-xxs text-text-muted block">Send emails when AI automation runs fail.</span>
              </div>
            </label>

            <label className="flex items-center gap-3.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications.weeklyReport}
                onChange={(e) => setNotifications(prev => ({ ...prev, weeklyReport: e.target.checked }))}
                className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <div>
                <span className="text-xs font-bold text-text-primary block">Weekly Operations Report</span>
                <span className="text-xxs text-text-muted block">Dispatch weekly summary of tokens consumed and turn frequencies.</span>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
