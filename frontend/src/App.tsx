import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Sparkles, Paperclip, X, FileText, Plus, MessageSquare } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
  timestamp?: number;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const SESSIONS_KEY = 'chat_sessions';
const CURRENT_KEY = 'current_session_id';

function loadSessions(): ChatSession[] {
  try {
    const saved = localStorage.getItem(SESSIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function createSession(): ChatSession {
  return { id: Date.now().toString(), title: '新对话', messages: [], createdAt: Date.now() };
}

function getInitialState() {
  let sessions = loadSessions();
  if (sessions.length === 0) {
    const s = createSession();
    sessions = [s];
    saveSessions(sessions);
  }
  const savedId = localStorage.getItem(CURRENT_KEY);
  const currentId = (savedId && sessions.find(s => s.id === savedId))
    ? savedId
    : sessions[0].id;
  return { sessions, currentId };
}

const initial = getInitialState();

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(initial.sessions);
  const [currentId, setCurrentId] = useState<string>(initial.currentId);
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState({ model: 'gemini-3-flash-preview-thinking' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentId) || sessions[0];
  const messages = currentSession?.messages || [];

  useEffect(() => { saveSessions(sessions); }, [sessions]);
  useEffect(() => { localStorage.setItem(CURRENT_KEY, currentId); }, [currentId]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const updateMessages = (id: string, newMessages: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const firstUser = newMessages.find(m => m.role === 'user');
      const title = firstUser ? firstUser.content.slice(0, 20) || '新对话' : s.title;
      return { ...s, messages: newMessages, title };
    }));
  };

  const newChat = () => {
    const s = createSession();
    setSessions(prev => [s, ...prev]);
    setCurrentId(s.id);
    setInput('');
    setSelectedFiles([]);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      if (next.length === 0) {
        const s = createSession();
        setCurrentId(s.id);
        return [s];
      }
      if (id === currentId) setCurrentId(next[0].id);
      return next;
    });
  };

  const onSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    if (isLoading) return;

    const sessionId = currentId;
    const userMsg: Message = {
      role: 'user',
      content: input,
      files: selectedFiles.map(f => f.name),
      timestamp: Date.now()
    };
    const newMessages = [...messages, userMsg];
    updateMessages(sessionId, newMessages);

    const curInput = input;
    const curFiles = [...selectedFiles];
    setInput('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append('messages', JSON.stringify(newMessages.map(m => ({ role: m.role, content: m.content }))));
      fd.append('config', JSON.stringify({ model: config.model }));
      curFiles.forEach(f => fd.append('files', f));

      const res = await fetch('/api/chat', { method: 'POST', body: fd });
      const data = await res.json();

      if (data.choices?.[0]) {
        updateMessages(sessionId, [...newMessages, {
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: Date.now()
        }]);
      } else {
        throw new Error(data.error || '接入点响应异常');
      }
    } catch (err: any) {
      updateMessages(sessionId, [...newMessages, {
        role: 'assistant',
        content: `❌ 错误: ${err.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* 左侧历史记录侧栏 */}
      <aside className="sidebar">
        <button className="new-chat-btn" onClick={newChat}>
          <Plus size={15} /> 新对话
        </button>
        <div className="session-list">
          {sessions.map(s => (
            <div
              key={s.id}
              className={`session-item ${s.id === currentId ? 'active' : ''}`}
              onClick={() => setCurrentId(s.id)}
            >
              <MessageSquare size={13} style={{ flexShrink: 0 }} />
              <span className="session-title">{s.title}</span>
              <button
                className="session-del"
                onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* 右侧主区域 */}
      <div className="main-area">
        <header className="header">
          <div className="brand">
            <div className="brand-icon"><Sparkles size={18} /></div>
            <span>Gemini</span>
          </div>
          <button className="action-btn" title="模型设置" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
        </header>

        {showSettings && (
          <div className="settings-pop">
            <div className="setting-item">
              <label>AI 模型</label>
              <select value={config.model} onChange={e => setConfig({ ...config, model: e.target.value })}>
                <option value="gemini-3-flash-preview-thinking">gemini-3-flash-preview-thinking (默认)</option>
                <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                <option value="gemini-3-pro-preview-nothinking">gemini-3-pro-preview-nothinking</option>
                <option value="gemini-3-pro-preview-thinking">gemini-3-pro-preview-thinking</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
                <option value="gemini-3.1-pro-preview-thinking">gemini-3.1-pro-preview-thinking</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
            <div style={{ fontSize: '11px', color: '#86868b', marginTop: '10px' }}>
              * 敏感配置已加密托管在服务端，确保隐私安全。
            </div>
          </div>
        )}

        <div className="chat-scroll-area" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="welcome-hero">
              <Sparkles size={48} style={{ color: '#0071e3', marginBottom: '20px' }} />
              <h1>Gemini</h1>
              <p>您的私密 AI 助手已就绪</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role}`}>
                  <div className="avatar">
                    {m.role === 'user' ? <User size={20} /> : <Sparkles size={20} />}
                  </div>
                  <div className="bubble">
                    {m.content}
                    {m.files && m.files.length > 0 && (
                      <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                        {m.files.map((f, fi) => (
                          <div key={fi} style={{ fontSize: '11px', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileText size={10} /> {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="msg-row assistant">
                  <div className="avatar"><Sparkles size={20} /></div>
                  <div className="bubble thinking-bubble">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bottom-area">
          <div className="input-pill">
            <button className="action-btn" onClick={() => fileRef.current?.click()}>
              <Paperclip size={20} />
            </button>
            <input type="file" multiple hidden ref={fileRef} onChange={e => e.target.files && setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {selectedFiles.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', padding: '5px 0', flexWrap: 'wrap' }}>
                  {selectedFiles.map((f, i) => (
                    <div key={i} style={{ fontSize: '11px', background: 'rgba(0,113,227,0.1)', color: '#0071e3', padding: '2px 10px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {f.name} <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
                    </div>
                  ))}
                </div>
              )}
              <textarea
                rows={1}
                placeholder="询问 Gemini..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                disabled={isLoading}
              />
            </div>
            <button
              className={`action-btn ${(input || selectedFiles.length > 0) && !isLoading ? 'send-active' : ''}`}
              onClick={onSend}
              disabled={isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
