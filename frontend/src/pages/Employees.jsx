import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { fetchEmployees, createEmployee, toggleEmployeeStatus, deleteEmployee } from '../services/employee';
import api from '../services/api';
import { 
  Users, Plus, Search, Sparkles, Filter, 
  Trash2, Settings2, ShieldCheck, ShieldAlert, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmployee } from '../context/EmployeeContext';

const Employees = () => {
  const { selectedEmployee, setSelectedEmployee } = useEmployee();
  const [employees, setEmployees] = useState([]);
  const [errorState, setErrorState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'HR',
    avatar_url: '',
    system_prompt: '',
    personality_prompt: '',
    goal: '',
    tone: 'professional',
    temperature: 0.7,
    max_tokens: 1000
  });

  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const categories = ['All', 'HR', 'Sales', 'Support', 'Marketing', 'Recruiter', 'Finance', 'Operations'];

  // Unsplash category avatar helper
  const getRandomAvatar = (cat) => {
    const avatars = {
      HR: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
      Sales: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80',
      Support: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      Marketing: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80',
      Recruiter: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
      Finance: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80',
      Operations: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
    };
    return avatars[cat] || avatars.Support;
  };

  const loadEmployees = async (retryCount = 0) => {
    const maxRetries = 5;
    try {
      if (retryCount > 0) {
        setIsReconnecting(true);
        setReconnectAttempt(retryCount);
      } else {
        setLoading(true);
        setErrorState(null);
      }
      const res = await fetchEmployees();
      if (res.success) {
        setEmployees(res.data);
        setIsReconnecting(false);
        setReconnectAttempt(0);
      }
    } catch (error) {
      console.error('loadEmployees error:', error);

      // Reconnect logic: if backend is down/starting, retry up to 5 times
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || (error.message && error.message.includes('Network Error'));
      
      if (isNetworkError && retryCount < maxRetries) {
        setIsReconnecting(true);
        setReconnectAttempt(retryCount + 1);
        console.log(`Backend unreachable, retrying connection (${retryCount + 1}/${maxRetries}) in 1.5s...`);
        setTimeout(() => {
          loadEmployees(retryCount + 1);
        }, 1500);
        return;
      }

      setIsReconnecting(false);
      setReconnectAttempt(0);
      
      // Ping health check to see if backend itself is reachable
      try {
        const healthRes = await api.get('/health');
        if (healthRes.status === 200) {
          // Backend is reachable, so the error must be a database connection issue
          setErrorState('database_unavailable');
          showToast('Database is not connected.', 'error');
        } else {
          setErrorState('backend_unavailable');
          showToast('Backend server is not connected.', 'error');
        }
      } catch (healthError) {
        console.error('Health check ping failed:', healthError);
        if (
          (healthError.response && healthError.response.status === 503) ||
          (error.response && error.response.status === 503) ||
          (error.response && error.response.data && error.response.data.message === 'Database not connected')
        ) {
          setErrorState('database_unavailable');
          showToast('Database is not connected.', 'error');
        } else {
          setErrorState('backend_unavailable');
          showToast('Backend server is not connected.', 'error');
        }
      }
    } finally {
      if (retryCount === 0 || retryCount >= maxRetries) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const res = await toggleEmployeeStatus(id, nextStatus);
      if (res.success) {
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: nextStatus } : e));
        showToast(`Employee status changed to ${nextStatus}`, 'success');
      }
    } catch (error) {
      showToast('Failed to toggle status.', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to fire this digital employee? All related prompts and knowledge base configs will be removed.')) return;
    try {
      const res = await deleteEmployee(id);
      if (res.success) {
        setEmployees(prev => prev.filter(emp => emp.id !== id));
        showToast('Digital worker removed from directory.', 'success');
      }
    } catch (error) {
      showToast('Failed to remove worker.', 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.system_prompt) {
      showToast('Name and System instructions are required.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        avatar_url: formData.avatar_url || getRandomAvatar(formData.category)
      };
      
      const res = await createEmployee(payload);
      if (res.success) {
        showToast('AI Digital Worker hired successfully!', 'success');
        setModalOpen(false);
        // Reset form
        setFormData({
          name: '',
          category: 'HR',
          avatar_url: '',
          system_prompt: '',
          personality_prompt: '',
          goal: '',
          tone: 'professional',
          temperature: 0.7,
          max_tokens: 1000
        });
        loadEmployees();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create worker.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                          emp.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || emp.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Digital Worker Directory</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Deploy, configuration-manage, and query your company's custom AI agents.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-primary/30 transition hover:scale-101 duration-150"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Hire Digital Worker</span>
        </button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8 bg-bg-secondary p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search workers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-bg-primary border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-primary transition"
          />
        </div>

        {/* Categories filters */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition select-none ${
                selectedCategory === cat
                  ? 'bg-primary border-primary text-white'
                  : 'bg-bg-primary border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Workers Grid */}
      {isReconnecting ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-bg-secondary max-w-xl mx-auto my-8 p-8 shadow-xs">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-bold text-text-primary">Connecting to Backend Service...</h3>
          <p className="text-xs text-text-secondary mt-2">
            Attempt {reconnectAttempt} of 5. Re-establishing secure socket connection.
          </p>
        </div>
      ) : errorState ? (
        <div className="text-center py-16 border border-dashed border-red-500/30 rounded-2xl bg-red-500/5 max-w-xl mx-auto my-8 p-8">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-text-primary">
            {errorState === 'backend_unavailable' ? 'Backend not connected' : 'Database not connected'}
          </h3>
          <p className="text-sm text-text-secondary mt-3 leading-relaxed">
            {errorState === 'backend_unavailable' 
              ? 'The PersonaForge AI backend server is currently unreachable. Please make sure the local server is running on port 5000.'
              : 'The database connection is unavailable. Please verify that your database service is active and the connection configuration is set up.'}
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => loadEmployees(0)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-primary/35 transition hover:scale-102 active:scale-98 duration-150"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 rounded-2xl border border-border bg-bg-secondary p-6 animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-bg-tertiary"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-28 bg-bg-tertiary rounded"></div>
                  <div className="h-3 w-16 bg-bg-tertiary rounded"></div>
                </div>
              </div>
              <div className="h-4 w-full bg-bg-tertiary rounded mt-4"></div>
              <div className="h-10 w-full bg-bg-tertiary rounded-xl mt-4"></div>
            </div>
          ))}
        </div>
      ) : filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filteredEmployees.map((emp) => (
              <motion.div
                key={emp.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ y: -3 }}
                onClick={() => setSelectedEmployee(emp)}
                className={`rounded-2xl border bg-bg-secondary p-6 shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                  selectedEmployee?.id === emp.id 
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md shadow-primary/5' 
                    : 'border-border hover:border-text-muted/30'
                }`}
              >
                <div>
                  {/* Avatar & Title Row */}
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 items-center">
                      <img 
                        src={emp.avatar_url || getRandomAvatar(emp.category)} 
                        alt={emp.name} 
                        className="h-14 w-14 rounded-full object-cover border border-border bg-bg-primary shadow-xs shrink-0"
                      />
                      <div>
                        <h3 className="font-bold text-text-primary text-base truncate max-w-40">{emp.name}</h3>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="inline-block text-xxs font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                            {emp.category}
                          </span>
                          {selectedEmployee?.id === emp.id && (
                            <span className="inline-block text-xxs font-extrabold bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-full animate-pulse border border-emerald-500/20">
                              Selected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/employees/${emp.id}`); }}
                        className="p-2 text-text-muted hover:text-primary transition hover:bg-bg-tertiary rounded-lg"
                        title="Configure settings & Knowledge base"
                      >
                        <Settings2 className="h-4.5 w-4.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(emp.id, e)}
                        className="p-2 text-text-muted hover:text-red-500 transition hover:bg-red-500/10 rounded-lg"
                        title="Delete worker"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description / System Instruction Preview */}
                  <p className="mt-4 text-xs text-text-secondary line-clamp-3 leading-relaxed">
                    {emp.system_prompt}
                  </p>
                </div>

                {/* Operations Footer */}
                <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
                  <span className="text-xxs text-text-muted">
                    Joined {new Date(emp.created_at).toLocaleDateString()}
                  </span>
                  
                  {/* Status Toggle */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(emp.id, emp.status); }}
                    className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border select-none transition ${
                      emp.status === 'active'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500'
                        : 'border-zinc-500/20 bg-zinc-500/10 text-text-muted'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`}></span>
                    <span className="capitalize">{emp.status}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-bg-secondary/40">
          <Users className="h-10 w-10 text-primary/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-text-primary">No digital workers match your query</h3>
          <p className="text-sm text-text-secondary mt-1 max-w-sm mx-auto">
            Harness the power of AI employees by deploying your first HR, Recruiter, or Support assistant.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-primary/35 transition"
          >
            <Plus className="h-4.5 w-4.5" /> Start Now
          </button>
        </div>
      )}

      {/* Creation Drawer Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop overlay */}
            <div 
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs" 
              onClick={() => setModalOpen(false)}
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-bg-secondary border-l border-border shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <div className="flex items-center gap-2 font-black text-xl text-primary">
                  <Sparkles className="h-5.5 w-5.5" />
                  <span>Hire New Digital Employee</span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg p-1.5 text-text-muted hover:bg-bg-tertiary hover:text-text-primary transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Employee Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sophia Williams"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Role Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    >
                      {categories.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c} Assistant</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Avatar Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="Leave empty for category default portrait"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">System Instructions / Prompt</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Define the digital employee's core instructions, bounds of expertise, and operational logic."
                    value={formData.system_prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Personality & Tone</label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData(prev => ({ ...prev, tone: e.target.value }))}
                      className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly & Supportive</option>
                      <option value="enthusiastic">Enthusiastic & Sharp</option>
                      <option value="concise">Concise & Direct</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Operational Goal</label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule meetings, answer product queries"
                      value={formData.goal}
                      onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                      className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Temperature ({formData.temperature})</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={formData.temperature}
                      onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="mt-3.5 w-full accent-primary"
                    />
                    <div className="flex justify-between text-xxs text-text-muted mt-1">
                      <span>Strict / Factual (0)</span>
                      <span>Creative (1)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Max Tokens ({formData.max_tokens})</label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      value={formData.max_tokens}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                      className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-6 flex justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-sm font-bold text-text-secondary hover:bg-bg-tertiary transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition"
                  >
                    {submitting ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      'Hire Employee'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Employees;
