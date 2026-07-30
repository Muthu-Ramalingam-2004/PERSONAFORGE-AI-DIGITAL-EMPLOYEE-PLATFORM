import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useEmployee } from '../context/EmployeeContext';
import { fetchEmployeeById } from '../services/employee';
import { fetchDocuments, uploadDocument, deleteDocument, searchKB } from '../services/kb';
import { 
  ArrowLeft, BookOpen, Upload, Trash2, 
  Search, FileText, HelpCircle, RefreshCw, Layers 
} from 'lucide-react';
import { motion } from 'framer-motion';

const KnowledgeBase = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { selectedEmployee, setSelectedEmployee, setIsSelectionModalOpen } = useEmployee();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load employee and documents
  const loadData = async (id) => {
    try {
      setLoading(true);
      const empRes = await fetchEmployeeById(id);
      if (empRes.success) {
        setEmployee(empRes.data);
        // Sync with global state
        setSelectedEmployee(empRes.data);
      } else {
        throw new Error('AI Employee not found');
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
    if (employeeId) {
      loadData(employeeId);
    } else {
      // If we landed here without an ID
      if (selectedEmployee?.id) {
        navigate(`/knowledge-base/${selectedEmployee.id}`, { replace: true });
      } else {
        setLoading(false);
        setIsSelectionModalOpen(true);
      }
    }
  }, [employeeId]);

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
      const res = await uploadDocument(employeeId, file);
      if (res.success) {
        showToast('Document uploaded and text chunks indexed!', 'success');
        // Reload documents
        const kbRes = await fetchDocuments(employeeId);
        if (kbRes.success) setDocuments(kbRes.data);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to upload document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document and remove all its indexed vector chunks?')) return;
    try {
      const res = await deleteDocument(docId);
      if (res.success) {
        setDocuments(prev => prev.filter(d => d.id !== docId));
        showToast('Document successfully deleted.', 'success');
      }
    } catch (error) {
      showToast('Failed to delete document.', 'error');
    }
  };

  const handleKBQuery = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await searchKB(employeeId, searchQuery);
      if (res.success) {
        setSearchResults(res.data);
      }
    } catch (error) {
      showToast('Failed to execute semantic search query.', 'error');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-semibold text-text-secondary">Retrieving knowledge profile...</p>
        </div>
      </div>
    );
  }

  // If no worker is selected and URL is missing ID
  if (!employee) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto mb-6 shadow-sm">
          <BookOpen className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">No Employee Selected</h2>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed">
          Please select a digital worker from the directory list before configuring their vector knowledge database.
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
      {/* Back navigation and title */}
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
          <h1 className="text-2xl font-black text-text-primary tracking-tight">{employee.name} — Knowledge Base</h1>
          <p className="mt-1.5 text-xs text-text-secondary">
            Manage files and references used by {employee.name} to generate context-specific RAG replies in chat.
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
        {/* Left Column: Documents List & Upload */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5.5 w-5.5 text-primary" />
                <h2 className="text-lg font-bold text-text-primary">Knowledge Documents</h2>
              </div>

              {/* Upload Trigger Button */}
              <label className={`flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white cursor-pointer hover:bg-primary-hover shadow-md shadow-primary/15 transition select-none ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
                {uploading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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

            {/* Document Listing */}
            {documents.length > 0 ? (
              <div className="space-y-3.5">
                {documents.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border bg-bg-primary/30 hover:bg-bg-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="rounded-xl bg-primary/10 p-2.5 text-primary shrink-0">
                        <FileText className="h-5.5 w-5.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate pr-4">{doc.name}</p>
                        <span className="inline-flex flex-wrap items-center gap-1.5 text-xxs text-text-muted mt-1 font-semibold">
                          <span>
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : `${doc.char_count || 0} chars`}
                          </span>
                          <span>•</span>
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xxs font-bold uppercase select-none ${
                        doc.status === 'processed' 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15' 
                          : doc.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/15'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/15 animate-pulse'
                      }`}>
                        <span className={`h-1 w-1 rounded-full ${
                          doc.status === 'processed' ? 'bg-emerald-500' : doc.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500 animate-ping'
                        }`}></span>
                        {doc.status}
                      </span>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition duration-150"
                        title="Delete document"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-bg-primary/20 select-none">
                <FileText className="h-10 w-10 text-text-muted/40 mx-auto mb-4 animate-pulse" />
                <h3 className="text-base font-extrabold text-text-primary">No training files indexed</h3>
                <p className="text-xs text-text-secondary mt-1.5 max-w-sm mx-auto leading-relaxed">
                  Provide custom information guides, operational standards, or company playbooks to augment agent answers.
                </p>
                <div className="mt-6 flex justify-center">
                  <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary hover:bg-bg-tertiary px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer transition select-none">
                    <Upload className="h-4 w-4" />
                    <span>Upload First Document</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: RAG Retrieval Tester */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-bg-secondary p-6 shadow-sm h-fit">
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="h-4.5 w-4.5 text-primary" />
                <h3 className="text-base font-extrabold text-text-primary">RAG Search Simulator</h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Submit questions to query how document contents are chunked and returned to the model during execution.
              </p>
            </div>

            <form onSubmit={handleKBQuery} className="relative mb-6">
              <input
                type="text"
                placeholder="Ask a question about the documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-primary border border-border rounded-xl py-3 pl-4 pr-11 text-xs text-text-primary focus:outline-none focus:border-primary transition"
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="absolute right-2.5 top-2 p-1.5 text-text-muted hover:text-primary disabled:opacity-40 transition-colors"
              >
                {searching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                ) : (
                  <Search className="h-4.5 w-4.5" />
                )}
              </button>
            </form>

            {/* Results Render */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {searchResults.length > 0 ? (
                searchResults.map((res, index) => (
                  <div 
                    key={index}
                    className="p-3.5 rounded-xl border border-border bg-bg-primary/50 text-xxs leading-relaxed text-text-secondary flex gap-2.5"
                  >
                    <span className="font-bold text-primary text-xs shrink-0 mt-0.5">#{index + 1}</span>
                    <div>
                      <p className="italic">"{res.content}"</p>
                      {res.document_name && (
                        <div className="text-text-muted font-semibold mt-1.5 flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>Source: {res.document_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xxs text-text-muted border border-dashed border-border rounded-xl bg-bg-primary/10">
                  <HelpCircle className="h-6 w-6 text-text-muted/30 mx-auto mb-2" />
                  Enter a test query to inspect matching document snippets.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
