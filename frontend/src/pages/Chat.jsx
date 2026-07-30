import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext';
import { fetchChats, fetchChatMessages, createChat, sendChatMessage, deleteChat } from '../services/chat';
import { fetchEmployees } from '../services/employee';
import { 
  Send, MessageSquare, Plus, Trash2, Download, 
  Sparkles, ChevronLeft, User, AlertCircle, Bot 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
  const { showToast } = useToast();
  const [chats, setChats] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  
  const [inputText, setInputText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Selector Overlay
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat' on mobile

  const messagesEndRef = useRef(null);

  const loadInitialData = async () => {
    try {
      setLoadingChats(true);
      const [chatsRes, empsRes] = await Promise.all([
        fetchChats(),
        fetchEmployees()
      ]);
      
      if (chatsRes.success) setChats(chatsRes.data);
      if (empsRes.success) setEmployees(empsRes.data.filter(e => e.status === 'active'));
    } catch (error) {
      showToast('Failed to load chat history.', 'error');
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSelectChat = async (chat) => {
    setActiveChat(chat);
    setMobileView('chat');
    setLoadingMessages(true);
    try {
      const res = await fetchChatMessages(chat.id);
      if (res.success) {
        setMessages(res.data);
      }
    } catch (error) {
      showToast('Failed to retrieve messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleCreateChat = async (employeeId) => {
    setSelectorOpen(false);
    try {
      const res = await createChat(employeeId);
      if (res.success) {
        const newChat = res.data;
        // Retrieve details of the employee
        const emp = employees.find(e => e.id === employeeId);
        const enrichedChat = {
          ...newChat,
          employee_name: emp.name,
          employee_avatar: emp.avatar_url,
          employee_category: emp.category
        };
        
        setChats(prev => [enrichedChat, ...prev]);
        handleSelectChat(enrichedChat);
        showToast('New session initialized!', 'success');
      }
    } catch (error) {
      showToast('Failed to start chat session.', 'error');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || sending) return;

    const text = inputText;
    setInputText('');
    setSending(true);

    // Optimistically insert user message into view
    const tempUserMsg = {
      id: Math.random().toString(),
      sender: 'user',
      content: text,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await sendChatMessage(activeChat.id, text);
      if (res.success) {
        const { aiMessage } = res.data;
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id).concat(tempUserMsg, aiMessage));
      }
    } catch (error) {
      showToast('AI response generation failed.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation history permanently?')) return;
    try {
      const res = await deleteChat(chatId);
      if (res.success) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChat?.id === chatId) {
          setActiveChat(null);
          setMessages([]);
        }
        showToast('Chat history cleared.', 'success');
      }
    } catch (error) {
      showToast('Failed to delete chat.', 'error');
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    
    // Format messages text log
    const log = messages.map(m => {
      const senderName = m.sender === 'user' ? 'User' : activeChat.employee_name;
      return `[${new Date(m.created_at).toLocaleString()}] ${senderName}: ${m.content}`;
    }).join('\n\n');

    const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-export-${activeChat.employee_name.replace(/\s+/g, '-').toLowerCase()}-${activeChat.id.substring(0, 5)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Conversation exported successfully!', 'success');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-bg-primary select-none">
      {/* Sidebar - Sessions list (Hides on mobile when chat is active) */}
      <div className={`w-full md:w-80 shrink-0 border-r border-border bg-bg-secondary flex flex-col h-full ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-extrabold text-base text-text-primary">Chat Sessions</h2>
          <button
            onClick={() => setSelectorOpen(true)}
            className="flex items-center gap-1 text-xs font-bold bg-primary text-white px-3 py-2 rounded-xl shadow-xs hover:bg-primary-hover transition duration-150"
          >
            <Plus className="h-4 w-4" /> Start New
          </button>
        </div>

        {/* Chats lists */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingChats ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-xl bg-bg-primary animate-pulse border border-border/50"></div>
            ))
          ) : chats.length > 0 ? (
            chats.map((chat) => {
              const isSelected = activeChat?.id === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`group flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/10 border-primary/40 text-primary' 
                      : 'border-border bg-bg-primary/30 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={chat.employee_avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'} 
                      alt="" 
                      className="h-9 w-9 rounded-full object-cover border border-border bg-bg-secondary shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{chat.title}</p>
                      <span className="text-xxs text-text-muted mt-0.5 truncate block capitalize">{chat.employee_category}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-xs text-text-muted">
              No chat history. Start a new session to begin.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Panel (Hides on mobile when list is active) */}
      <div className={`flex-1 flex flex-col h-full bg-bg-primary/40 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Panel Header */}
            <div className="h-16 border-b border-border bg-bg-secondary px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setMobileView('list')}
                  className="p-1.5 text-text-muted hover:bg-bg-tertiary rounded-lg md:hidden mr-1"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <img 
                  src={activeChat.employee_avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'} 
                  alt="" 
                  className="h-9 w-9 rounded-full object-cover border border-border bg-bg-primary shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text-primary truncate">{activeChat.employee_name}</h3>
                  <span className="flex items-center gap-1 text-xxs text-emerald-500 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </div>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportChat}
                  disabled={messages.length === 0}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-xl transition disabled:opacity-50"
                  title="Export Chat History"
                >
                  <Download className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={(e) => handleDeleteChat(activeChat.id, e)}
                  className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition"
                  title="Clear Chat History"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Messages List Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div 
                      key={msg.id}
                      className={`flex gap-3 max-w-2xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      <div className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${
                        isUser 
                          ? 'bg-primary text-white border-primary/20' 
                          : 'bg-bg-secondary text-text-primary border-border'
                      }`}>
                        {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5 text-primary" />}
                      </div>

                      {/* Bubble */}
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-primary text-white rounded-tr-none shadow-md shadow-primary/10'
                          : 'bg-bg-secondary border border-border text-text-primary rounded-tl-none shadow-xs leading-relaxed whitespace-pre-wrap'
                      }`}>
                        {msg.content}
                        <span className={`block text-xxs mt-2 text-right ${isUser ? 'text-white/60' : 'text-text-muted'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center p-8">
                  <MessageSquare className="h-10 w-10 text-primary/30 mb-3" />
                  <p className="text-sm font-bold text-text-secondary">Start conversation with {activeChat.employee_name}</p>
                  <p className="text-xs text-text-muted mt-1">AI employee will respond in context of their prompt instructions and knowledge base.</p>
                </div>
              )}

              {/* Typing placeholder animation */}
              {sending && (
                <div className="flex gap-3 mr-auto max-w-md">
                  <div className="h-8 w-8 rounded-full bg-bg-secondary border border-border shrink-0 flex items-center justify-center text-xs font-bold text-primary">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                  <div className="p-4 rounded-2xl border border-border bg-bg-secondary/70 text-text-secondary rounded-tl-none shadow-xs flex items-center gap-1.5 h-11 shrink-0">
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce"></span>
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Send Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-bg-secondary flex gap-3 shrink-0 select-none">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type a message to ${activeChat.employee_name}...`}
                className="flex-1 bg-bg-primary border border-border rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-primary placeholder-text-muted transition duration-150"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary-hover disabled:opacity-50 transition shrink-0"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </>
        ) : (
          /* Empty Chat view */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <Sparkles className="h-10 w-10 text-primary/30 mb-3 animate-pulse" />
            <h3 className="text-base font-bold text-text-primary">Deploy Your Digital Workers</h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              Select an active conversation session from the left drawer sidebar, or initialize a new console prompt to begin training.
            </p>
            <button
              onClick={() => setSelectorOpen(true)}
              className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-primary-hover shadow-md transition"
            >
              <Plus className="h-4 w-4" /> Deploy Worker
            </button>
          </div>
        )}
      </div>

      {/* Select Employee Overlay Modal */}
      <AnimatePresence>
        {selectorOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
              onClick={() => setSelectorOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-bg-secondary border border-border p-6 rounded-2xl shadow-2xl"
            >
              <h3 className="text-base font-extrabold text-text-primary mb-4">Start Session with Employee</h3>
              
              <div className="space-y-2.5 max-h-76 overflow-y-auto pr-1">
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => handleCreateChat(emp.id)}
                      className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-bg-primary/40 hover:border-primary/30 transition cursor-pointer"
                    >
                      <img 
                        src={emp.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80'} 
                        alt="" 
                        className="h-10 w-10 rounded-full object-cover border border-border bg-bg-secondary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{emp.name}</p>
                        <span className="inline-block text-xxs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-1 capitalize">
                          {emp.category}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-text-muted">
                    No active digital employees found. Go deploy one first!
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectorOpen(false)}
                  className="rounded-xl border border-border bg-bg-secondary px-4 py-2.5 text-xs font-bold text-text-secondary hover:bg-bg-tertiary transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
