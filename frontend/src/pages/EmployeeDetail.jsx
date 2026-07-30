import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { fetchEmployeeById, updateEmployee } from '../services/employee';
import { fetchDocuments, uploadDocument, deleteDocument, searchKB } from '../services/kb';
import { 
  ArrowLeft, Terminal, BookOpen, Save, Upload, Trash2, 
  Search, Sparkles, AlertCircle, FileText, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { motion } from 'framer-motion';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('prompt'); // 'prompt' or 'kb'
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // KB States
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load employee config & documents lists
  const loadData = async () => {
    try {
      setLoading(true);
      const empRes = await fetchEmployeeById(id);
      if (empRes.success) {
        setEmployee(empRes.data);
      }
      
      const kbRes = await fetchDocuments(id);
      if (kbRes.success) {
        setDocuments(kbRes.data);
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to load employee configurations.', 'error');
      navigate('/employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateEmployee(id, employee);
      if (res.success) {
        showToast('Worker prompt configurations updated!', 'success');
      }
    } catch (error) {
      showToast('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size must be under 10MB.', 'warning');
      return;
    }

    setUploading(true);
    try {
      const res = await uploadDocument(id, file);
      if (res.success) {
        showToast('Document uploaded and text chunks indexed!', 'success');
        // Reload documents list
        const kbRes = await fetchDocuments(id);
        if (kbRes.success) setDocuments(kbRes.data);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Remove this document and all indexed chunks?')) return;
    try {
      const res = await deleteDocument(docId);
      if (res.success) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        showToast('Document deleted.', 'success');
      }
    } catch (error) {
      showToast('Failed to delete document.', 'error');
    }
  };

  const handleRagSearch = async (e) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;

    setSearching(true);
    try {
      const res = await searchKB(id, ragQuery);
      if (res.success) {
        setRagResults(res.data);
      }
    } catch (error) {
      showToast('Failed to execute similarity query.', 'error');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-semibold text-text-secondary">Loading digital configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 select-none">
      {/* Header Back navigation */}
      <button
        onClick={() => navigate('/employees')}
        className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-text-primary mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to workers list
      </button>

      {/* Profile Overview Card */}
      <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm mb-8 flex flex-col sm:flex-row items-center gap-6">
        <img
          src={employee?.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'}
          alt={employee?.name}
          className="h-20 w-20 rounded-full object-cover border border-border bg-bg-primary shadow-xs"
        />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-2xl font-bold text-text-primary">{employee?.name}</h2>
          <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
            <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-0.5 rounded-full capitalize">
              {employee?.category} Department
            </span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className={`h-2 w-2 rounded-full ${employee?.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
              <span className="capitalize">{employee?.status}</span>
            </span>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border border-border rounded-xl p-1 bg-bg-primary shrink-0 select-none">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'prompt'
                ? 'bg-bg-secondary text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Terminal className="h-4 w-4" /> Prompt Manager
          </button>
          <button
            onClick={() => setActiveTab('kb')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'kb'
                ? 'bg-bg-secondary text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Knowledge Base (RAG)
          </button>
        </div>
      </div>

      {/* Tabs panels */}
      <div className="space-y-8">
        {activeTab === 'prompt' ? (
          /* Prompt manager tab */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 font-black text-lg text-text-primary border-b border-border pb-4 mb-6">
              <Terminal className="h-5 w-5 text-primary" />
              <span>Prompt & Personality System</span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Display Name</label>
                  <input
                    type="text"
                    required
                    value={employee?.name || ''}
                    onChange={(e) => setEmployee(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Status</label>
                  <select
                    value={employee?.status || 'active'}
                    onChange={(e) => setEmployee(prev => ({ ...prev, status: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                  >
                    <option value="active">Active (Deploy in chat)</option>
                    <option value="inactive">Inactive (Offline)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Avatar URL</label>
                <input
                  type="url"
                  value={employee?.avatar_url || ''}
                  onChange={(e) => setEmployee(prev => ({ ...prev, avatar_url: e.target.value }))}
                  className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">System Instruction / Base Prompt</label>
                <textarea
                  rows={6}
                  required
                  value={employee?.system_prompt || ''}
                  onChange={(e) => setEmployee(prev => ({ ...prev, system_prompt: e.target.value }))}
                  className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Personality Traits</label>
                  <input
                    type="text"
                    value={employee?.personality_prompt || ''}
                    onChange={(e) => setEmployee(prev => ({ ...prev, personality_prompt: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    placeholder="e.g. Friendly, patient, empathetic"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Specific Target Goal</label>
                  <input
                    type="text"
                    value={employee?.goal || ''}
                    onChange={(e) => setEmployee(prev => ({ ...prev, goal: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                    placeholder="e.g. Assist customers, capture leads"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Tone</label>
                  <select
                    value={employee?.tone || 'professional'}
                    onChange={(e) => setEmployee(prev => ({ ...prev, tone: e.target.value }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="concise">Concise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Temperature ({employee?.temperature})</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={employee?.temperature || 0.7}
                    onChange={(e) => setEmployee(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="mt-4.5 w-full accent-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted">Max Output Tokens</label>
                  <input
                    type="number"
                    min="100"
                    max="4000"
                    value={employee?.max_tokens || 1000}
                    onChange={(e) => setEmployee(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
                    className="mt-1.5 w-full bg-bg-primary border border-border rounded-xl py-2.5 px-3.5 text-sm text-text-primary focus:outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-hover transition"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Save className="h-4.5 w-4.5" />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Knowledge base tab */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-8 lg:grid-cols-3"
          >
            {/* Documents List & upload */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2 font-black text-lg text-text-primary">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span>Knowledge Documents</span>
                </div>

                {/* Upload Button overlay */}
                <label className={`flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-primary-hover shadow-xs transition select-none ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
                  {uploading ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Upload PDF / TXT</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* Docs listing */}
              <div className="space-y-3">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg-primary/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text-primary truncate pr-2">{doc.name}</p>
                          <span className="inline-block text-xxs text-text-muted mt-0.5">
                            {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-bold select-none ${
                          doc.status === 'processed' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : doc.status === 'failed'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-amber-500/10 text-amber-500 animate-pulse'
                        }`}>
                          {doc.status}
                        </span>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 border border-dashed border-border rounded-xl">
                    <FileText className="h-8 w-8 text-text-muted/40 mx-auto mb-3" />
                    <p className="text-sm font-bold text-text-secondary">No files uploaded yet</p>
                    <p className="text-xs text-text-muted mt-1">Upload training manuals, SOPs, or guides to enable RAG answers.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RAG Tester Panel */}
            <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm h-fit">
              <div className="mb-4">
                <h3 className="text-base font-extrabold text-text-primary">RAG Simulator</h3>
                <p className="text-xs text-text-muted">Query the semantic knowledge database to inspect what context chunks are returned.</p>
              </div>

              <form onSubmit={handleRagSearch} className="relative mb-6">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-xl py-2.5 pl-3 pr-10 text-xs text-text-primary focus:outline-none focus:border-primary transition"
                />
                <button
                  type="submit"
                  disabled={searching || !ragQuery.trim()}
                  className="absolute right-2 top-2 p-1 text-text-muted hover:text-primary disabled:opacity-50"
                >
                  {searching ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  ) : (
                    <Search className="h-4.5 w-4.5" />
                  )}
                </button>
              </form>

              {/* RAG Query Output */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {ragResults.length > 0 ? (
                  ragResults.map((res, index) => (
                    <div 
                      key={res.id}
                      className="p-3.5 rounded-xl border border-border bg-bg-primary/50 text-xxs leading-relaxed text-text-secondary flex gap-2"
                    >
                      <span className="font-bold text-primary text-xs shrink-0 mt-0.5">#{index + 1}</span>
                      <p className="italic">{res.content}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xxs text-text-muted">
                    Enter a query to test RAG retrieval indexing.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDetail;
