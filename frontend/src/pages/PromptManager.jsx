import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useEmployee } from '../context/EmployeeContext';
import { fetchEmployeeById, updateEmployee } from '../services/employee';
import { 
  ArrowLeft, Terminal, Save, RotateCcw, 
  History, Clock, MessageSquare, Plus, Info, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

const PromptManager = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selectedEmployee, setSelectedEmployee, setIsSelectionModalOpen } = useEmployee();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomePrompt, setWelcomePrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  // Version history
  const [history, setHistory] = useState([]);

  // Load employee config
  const loadData = async (id) => {
    try {
      setLoading(true);
      const res = await fetchEmployeeById(id);
      if (res.success) {
        setEmployee(res.data);
        // Sync with global state
        setSelectedEmployee(res.data);

        // Bind form values
        setSystemPrompt(res.data.system_prompt || '');
        setCustomPrompt(res.data.personality_prompt || '');

        // Load Welcome Prompt from localStorage
        const savedWelcome = localStorage.getItem(`welcome_prompt_${id}`);
        setWelcomePrompt(savedWelcome || `Hello! I am ${res.data.name}, your ${res.data.category} assistant. How can I help you today?`);

        // Load Edit History
        const savedHistory = localStorage.getItem(`prompt_history_${id}`);
        setHistory(savedHistory ? JSON.parse(savedHistory) : []);
      } else {
        throw new Error('AI Employee not found');
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to load prompt configs.', 'error');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      loadData(employeeId);
    } else {
      if (selectedEmployee?.id) {
        navigate(`/prompt-manager/${selectedEmployee.id}`, { replace: true });
      } else {
        setLoading(false);
        setIsSelectionModalOpen(true);
      }
    }
  }, [employeeId]);

  // Save changes
  const handleSave = async (e) => {
    e.preventDefault();
    if (!systemPrompt.trim()) {
      showToast('System instruction / Base prompt is required.', 'warning');
      return;
    }

    setSaving(true);
    try {
      // 1. Prepare backend payload (keep tone, temp, max_tokens)
      const payload = {
        ...employee,
        system_prompt: systemPrompt,
        personality_prompt: customPrompt,
      };

      // 2. Call API
      const res = await updateEmployee(employeeId, payload);
      if (res.success) {
        // Update local employee state
        setEmployee(res.data);

        // 3. Save Welcome Prompt to localStorage
        localStorage.setItem(`welcome_prompt_${employeeId}`, welcomePrompt);

        // 4. Update and persist History Log
        const newHistoryItem = {
          timestamp: new Date().toISOString(),
          systemPrompt,
          welcomePrompt,
          customPrompt
        };

        const updatedHistory = [newHistoryItem, ...history].slice(0, 15); // Cap at 15 items
        setHistory(updatedHistory);
        localStorage.setItem(`prompt_history_${employeeId}`, JSON.stringify(updatedHistory));

        showToast('Worker prompt configurations updated!', 'success');
      }
    } catch (error) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset inputs to last saved values
  const handleReset = () => {
    if (!employee) return;
    if (!window.confirm('Reset the editor to the last saved configuration? Current edits will be lost.')) return;

    setSystemPrompt(employee.system_prompt || '');
    setCustomPrompt(employee.personality_prompt || '');
    
    const savedWelcome = localStorage.getItem(`welcome_prompt_${employeeId}`);
    setWelcomePrompt(savedWelcome || `Hello! I am ${employee.name}, your ${employee.category} assistant. How can I help you today?`);
    
    showToast('Form inputs reset to last saved state.', 'info');
  };

  // Restore history version
  const handleRestoreHistory = (item) => {
    if (!window.confirm('Apply this historical prompt snapshot to the editor? You must click Save to persist it.')) return;
    
    setSystemPrompt(item.systemPrompt || '');
    setWelcomePrompt(item.welcomePrompt || '');
    setCustomPrompt(item.customPrompt || '');

    showToast('Loaded snapshot into inputs. Review and click Save to apply.', 'warning');
  };

  // Clear history log
  const handleClearHistory = () => {
    if (!window.confirm('Delete all stored version history snapshots for this worker?')) return;
    setHistory([]);
    localStorage.removeItem(`prompt_history_${employeeId}`);
    showToast('Version log cleared.', 'success');
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-semibold text-text-secondary">Loading instruction context...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-6 shadow-sm">
          <Terminal className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">No Employee Selected</h2>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed">
          Please select a digital worker from the directory list before configuring prompt instructions.
        </p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/15 hover:bg-primary-hover hover:shadow-primary/25 transition transform active:scale-98"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go to AI Employees</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button & top config status header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/employees')}
          className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary transition h-fit w-fit"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-muted">Currently Configuring:</span>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">
            {employee.name}
          </span>
          <button
            onClick={() => navigate('/employees')}
            className="text-xxs font-bold text-primary hover:underline ml-1"
          >
            Switch Worker
          </button>
        </div>
      </div>

      {/* Header Profile Overview Card */}
      <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-xs mb-8 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={employee.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'}
          alt={employee.name}
          className="h-16 w-16 rounded-full object-cover border border-border bg-bg-primary shadow-xs"
        />
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-black text-text-primary tracking-tight">{employee.name} — Prompt Manager</h1>
          <p className="mt-1.5 text-xs text-text-secondary">
            Refine system logic guidelines, customize the chat greetings, and check previous prompt settings.
          </p>
        </div>
        <div className="flex items-center gap-2 select-none border border-border rounded-xl p-2 bg-bg-primary/50 shrink-0">
          <span className="text-xxs font-bold uppercase tracking-wider text-text-muted px-1.5">Category</span>
          <span className="text-xs font-black bg-primary/10 text-primary px-3 py-1 rounded-lg capitalize">
            {employee.category} Department
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Editor Form Columns */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Terminal className="h-5.5 w-5.5 text-primary" />
              <h2 className="text-lg font-bold text-text-primary font-bold">Configure Prompt Settings</h2>
            </div>

            {/* System Prompt Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted">
                  System Prompt (Core Behavior)
                </label>
                <span className="text-xxs text-text-muted font-bold bg-bg-primary border border-border px-2 py-0.5 rounded-md">Required</span>
              </div>
              <textarea
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Instruct the AI worker's base rules, identity constraints, and limits of knowledge..."
                className="w-full bg-bg-primary border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition leading-relaxed font-sans"
              />
              <p className="mt-1.5 text-xxs text-text-muted">
                This prompt defines who the worker is and controls logic guidelines. It is sent as high-priority instructions to Gemini.
              </p>
            </div>

            {/* Welcome Prompt Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted">
                  Welcome Prompt (Initial Greeting)
                </label>
                <span className="text-xxs text-text-muted font-bold bg-bg-primary border border-border px-2 py-0.5 rounded-md">Chat Intro</span>
              </div>
              <textarea
                rows={3}
                value={welcomePrompt}
                onChange={(e) => setWelcomePrompt(e.target.value)}
                placeholder="Enter the greeting statement this worker sends immediately when a new chat starts..."
                className="w-full bg-bg-primary border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition leading-relaxed font-sans"
              />
              <p className="mt-1.5 text-xxs text-text-muted">
                The opening message this worker outputs as their first interaction block in the user chat console.
              </p>
            </div>

            {/* Custom Prompt Field */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-text-muted">
                  Custom Prompt (Traits & Details)
                </label>
                <span className="text-xxs text-text-muted font-bold bg-bg-primary border border-border px-2 py-0.5 rounded-md">Personality context</span>
              </div>
              <textarea
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add personality style details, e.g. 'Empathetic customer specialist, speaks clearly and directly'..."
                className="w-full bg-bg-primary border border-border rounded-xl py-3 px-4 text-sm text-text-primary focus:outline-none focus:border-primary transition leading-relaxed font-sans"
              />
              <p className="mt-1.5 text-xxs text-text-muted">
                Provides supplemental description for tone adjustments, styling options, or conversation formatting guidelines.
              </p>
            </div>

            {/* Action Bar */}
            <div className="border-t border-border pt-6 flex justify-between gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary px-4 py-2.5 text-sm font-bold text-text-secondary hover:text-text-primary transition"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Form</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition min-w-[120px]"
              >
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* History Column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm h-fit">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-1.5">
                <History className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-base font-extrabold text-text-primary">Prompt History</h3>
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xxs font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
              )}
            </div>

            {history.length > 0 ? (
              <div className="relative border-l border-border pl-4 space-y-6 max-h-[600px] overflow-y-auto pr-1">
                {history.map((item, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <div className="absolute -left-[22px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-primary bg-bg-secondary" />

                    {/* Content Box */}
                    <div className="bg-bg-primary/40 rounded-xl p-3.5 border border-border text-xxs flex flex-col gap-2">
                      <div className="flex items-center justify-between border-b border-border pb-1.5">
                        <span className="flex items-center gap-1 text-text-muted font-bold">
                          <Clock className="h-3 w-3 text-primary/60" />
                          {new Date(item.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </span>
                        <span className="text-xxs font-black text-primary">v{history.length - idx}</span>
                      </div>

                      {/* Snippets Preview */}
                      <div className="space-y-1 text-text-secondary leading-relaxed">
                        <div>
                          <span className="font-extrabold text-text-muted uppercase tracking-wider text-[9px] mr-1">System:</span>
                          <span className="line-clamp-2 italic">"{item.systemPrompt}"</span>
                        </div>
                        {item.welcomePrompt && (
                          <div>
                            <span className="font-extrabold text-text-muted uppercase tracking-wider text-[9px] mr-1">Welcome:</span>
                            <span className="line-clamp-1 italic">"{item.welcomePrompt}"</span>
                          </div>
                        )}
                        {item.customPrompt && (
                          <div>
                            <span className="font-extrabold text-text-muted uppercase tracking-wider text-[9px] mr-1">Custom:</span>
                            <span className="line-clamp-1 italic">"{item.customPrompt}"</span>
                          </div>
                        )}
                      </div>

                      {/* Action Restore */}
                      <button
                        onClick={() => handleRestoreHistory(item)}
                        className="mt-2 text-xxs font-bold text-primary hover:underline border border-primary/20 hover:border-primary/45 rounded-lg py-1 px-2.5 text-center bg-bg-secondary w-full"
                      >
                        Restore to Inputs
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* No History fallback */
              <div className="text-center py-12 text-xxs text-text-muted border border-dashed border-border rounded-xl bg-bg-primary/10">
                <Info className="h-6 w-6 text-text-muted/30 mx-auto mb-2" />
                No version logs found for this worker. Save adjustments to log versions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptManager;
