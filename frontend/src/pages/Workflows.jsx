import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchIntegrationsStatus, triggerWorkflow } from '../services/workflow';
import { 
  Cpu, Send, ShieldCheck, Mail, MessageSquare, 
  Calendar, CheckCircle2, Play, AlertCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

const Workflows = () => {
  const { showToast } = useToast();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Trigger form state
  const [selectedPlatform, setSelectedPlatform] = useState('gmail');
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState({
    to: '',
    subject: '',
    channel: '',
    phone: '',
    title: '',
    date: ''
  });
  const [lastOutput, setLastOutput] = useState('');

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetchIntegrationsStatus();
      if (res.success) {
        setIntegrations(res.data);
      }
    } catch (error) {
      showToast('Failed to check integration configs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleTriggerRun = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setLastOutput('');
    
    // Choose properties based on platform
    let cleanPayload = {};
    if (selectedPlatform === 'gmail') {
      cleanPayload = { to: payload.to || 'client@company.com', subject: payload.subject || 'Automated AI Summary' };
    } else if (selectedPlatform === 'slack') {
      cleanPayload = { channel: payload.channel || 'marketing' };
    } else if (selectedPlatform === 'whatsapp') {
      cleanPayload = { phone: payload.phone || '+1 (555) 0199' };
    } else if (selectedPlatform === 'calendar') {
      cleanPayload = { title: payload.title || 'Client Briefing Session', date: payload.date || 'Tomorrow 10:00 AM' };
    }

    try {
      const res = await triggerWorkflow(selectedPlatform, 'trigger_simulation', cleanPayload);
      if (res.success) {
        showToast('Automation pipeline ran successfully!', 'success');
        setLastOutput(res.details);
      }
    } catch (error) {
      showToast('Automation task execution failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getPlatformIcon = (platformId) => {
    switch (platformId) {
      case 'gmail': return <Mail className="h-5 w-5 text-red-500" />;
      case 'calendar': return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'slack': return <MessageSquare className="h-5 w-5 text-indigo-500" />;
      case 'whatsapp': return <Send className="h-5 w-5 text-emerald-500" />;
      default: return <Cpu className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 select-none">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Workflow Automation</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Bridge your digital workers with business applications to execute automatic notification tasks.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Side: Connected channels */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-text-primary mb-6">Connected Channels</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {integrations.map((item) => (
                <div 
                  key={item.id}
                  className="rounded-xl border border-border bg-bg-primary/20 p-5 flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-bg-secondary border border-border p-2">
                      {getPlatformIcon(item.id)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">{item.name}</h4>
                      <span className={`inline-flex items-center gap-1 text-xxs font-semibold mt-1 select-none ${
                        item.connected ? 'text-emerald-500' : 'text-text-muted'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${item.connected ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`}></span>
                        {item.connected ? 'Active/Connected' : 'Configure key'}
                      </span>
                    </div>
                  </div>
                  
                  <p className="mt-4 text-xxs text-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Sandbox controller */}
        <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm h-fit">
          <div className="mb-6">
            <h3 className="text-base font-extrabold text-text-primary flex items-center gap-2">
              <Play className="h-4.5 w-4.5 text-primary" />
              <span>Pipeline Sandbox</span>
            </h3>
            <p className="text-xs text-text-muted">Simulate workflow routing and test API payloads.</p>
          </div>

          <form onSubmit={handleTriggerRun} className="space-y-4">
            <div>
              <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Platform Channel</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
              >
                <option value="gmail">Gmail Service</option>
                <option value="slack">Slack Channel Bot</option>
                <option value="whatsapp">WhatsApp Business API</option>
                <option value="calendar">Google Calendar Event</option>
              </select>
            </div>

            {/* Platform-dependent arguments */}
            {selectedPlatform === 'gmail' && (
              <>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Recipient Email</label>
                  <input
                    type="email"
                    required
                    placeholder="client@domain.com"
                    value={payload.to}
                    onChange={(e) => setPayload(prev => ({ ...prev, to: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Subject Line</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales summary update"
                    value={payload.subject}
                    onChange={(e) => setPayload(prev => ({ ...prev, subject: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                  />
                </div>
              </>
            )}

            {selectedPlatform === 'slack' && (
              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Slack Channel</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. marketing-leads"
                  value={payload.channel}
                  onChange={(e) => setPayload(prev => ({ ...prev, channel: e.target.value }))}
                  className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                />
              </div>
            )}

            {selectedPlatform === 'whatsapp' && (
              <div>
                <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +1 (555) 0100"
                  value={payload.phone}
                  onChange={(e) => setPayload(prev => ({ ...prev, phone: e.target.value }))}
                  className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                />
              </div>
            )}

            {selectedPlatform === 'calendar' && (
              <>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Appointment Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Client consultation brief"
                    value={payload.title}
                    onChange={(e) => setPayload(prev => ({ ...prev, title: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold uppercase tracking-wider text-text-muted">Date & Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tomorrow 3:00 PM"
                    value={payload.date}
                    onChange={(e) => setPayload(prev => ({ ...prev, date: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2 px-3 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full justify-center items-center gap-2 rounded-xl bg-primary py-2.5 px-4 text-xs font-bold text-white hover:bg-primary-hover shadow-md transition disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" /> Run Automation
                </>
              )}
            </button>
          </form>

          {/* Sandbox console output */}
          {lastOutput && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 text-xxs leading-relaxed font-mono leading-relaxed"
            >
              <div className="flex items-center gap-1.5 mb-2 font-bold select-none">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Console Out (Success):</span>
              </div>
              {lastOutput}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workflows;
