import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Sparkles, Paperclip, X, FileText, Trash2, Plus, MessageSquare, Menu } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

function App() {
  // --- 状态管理 ---
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('gemini_history_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState({ model: 'gemini-3-flash-preview-thinking' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- 初始化与持久化 ---
  useEffect(() => {
    localStorage.setItem('gemini_history_v3', JSON.stringify(chats));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chats]);

  const activeChat = chats.find(c => c.id === activeId) || null;
  const messages = activeChat?.messages || [];

  // --- 操作逻辑 ---
  const createNewChat = () => {
    const newId = Date.now().toString();
    const newChat: ChatSession = { id: newId, title: '新对话', messages: [], timestamp: Date.now() };
    setChats([newChat, ...chats]);
    setActiveId(newId);
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = chats.filter(c => c.id !== id);
    setChats(updated);
    if (activeId === id) setActiveId(updated[0]?.id || null);
  };

  const onSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;
    
    let currentId = activeId;
    let currentChats = [...chats];

    // 如果当前没有活跃会话，先创建一个
    if (!currentId) {
      const newId = Date.now().toString();
      const newChat: ChatSession = { id: newId, title: input.slice(0, 15) || '新对话', messages: [], timestamp: Date.now() };
      currentChats = [newChat, ...currentChats];
      setChats(currentChats);
      setActiveId(newId);
      currentId = newId;
    }

    const userMsg: Message = { role: 'user', content: input, files: selectedFiles.map(f => f.name) };
    
    // 更新本地状态：添加用户消息
    const updatedChats = currentChats.map(c => {
      if (c.id === currentId) {
        return { ...c, messages: [...c.messages, userMsg], title: c.messages.length === 0 ? input.slice(0, 20) : c.title };
      }
      return c;
    });
    setChats(updatedChats);
    
    const curInput = input;
    const curFiles = [...selectedFiles];
    setInput('');
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      const fd = new FormData();
      fd.append('messages', JSON.stringify([...(activeChat?.messages || []), userMsg]));
      fd.append('config', JSON.stringify(config));
      curFiles.forEach(f => fd.append('files', f));

      const res = await fetch('/api/chat', { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.choices?.[0]) {
        const assistantMsg: Message = { role: 'assistant', content: data.choices[0].message.content };
        setChats(prev => prev.map(c => 
          c.id === currentId ? { ...c, messages: [...c.messages, assistantMsg] } : c
        ));
      }
    } catch (err: any) {
      const errMsg: Message = { role: 'assistant', content: `❌ 错误: ${err.message}` };
      setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, errMsg] } : c));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* 侧边栏 */}
      <aside className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={createNewChat}>
            <Plus size={18} /> <span>新建对话</span>
          </button>
        </div>
        <div className="history-list">
          {chats.map(chat => (
            <div key={chat.id} className={`history-item ${activeId === chat.id ? 'active' : ''}`} onClick={() => setActiveId(chat.id)}>
              <MessageSquare size={16} />
              <span className="chat-title">{chat.title}</span>
              <Trash2 className="delete-icon" size={14} onClick={(e) => deleteChat(chat.id, e)} />
            </div>
          ))}
        </div>
      </aside>

      {/* 主界面 */}
      <main className="main-content">
        <header className="header">
          <div className="left-group">
            <button className="action-btn" onClick={() => setShowSidebar(!showSidebar)}>
              <Menu size={20} />
            </button>
            <div className="brand">
              <div className="brand-icon"><Sparkles size={16} /></div>
              <span>Gemini</span>
            </div>
          </div>
          <button className="action-btn" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
        </header>

        {showSettings && (
          <div className="settings-pop">
            <label>AI 模型</label>
            <select value={config.model} onChange={e => setConfig({...config, model: e.target.value})}>
              <option value="gemini-3-flash-preview-thinking">gemini-3-flash-preview-thinking</option>
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              <option value="gemini-3-pro-preview-nothinking">gemini-3-pro-preview-nothinking</option>
              <option value="gemini-3-pro-preview-thinking">gemini-3-pro-preview-thinking</option>
              <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
              <option value="gemini-3.1-pro-preview-thinking">gemini-3.1-pro-preview-thinking</option>
              <option value="gpt-4o">gpt-4o</option>
            </select>
          </div>
        )}

        <div className="chat-area" ref={scrollRef}>
          {messages.length === 0 && !isLoading ? (
            <div className="hero">
              <h1>Gemini</h1>
              <p>有什么可以帮您的？</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role}`}>
                  <div className="avatar">{m.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}</div>
                  <div className="bubble">
                    {m.content}
                    {m.files && m.files.length > 0 && (
                      <div className="file-tags">
                        {m.files.map((f, fi) => <div key={fi} className="file-tag"><FileText size={10} /> {f}</div>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="msg-row assistant thinking">
                  <div className="avatar pulse"><Sparkles size={18} /></div>
                  <div className="bubble thinking-bubble">
                    <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="input-container">
          <div className="input-capsule">
            <button className="action-btn" onClick={() => fileRef.current?.click()}><Paperclip size={20} /></button>
            <input type="file" multiple hidden ref={fileRef} onChange={e => e.target.files && setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
            <div className="textarea-wrapper">
              {selectedFiles.length > 0 && (
                <div className="previews">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="preview-tag">{f.name} <X size={12} onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} /></div>
                  ))}
                </div>
              )}
              <textarea rows={1} placeholder="给 Gemini 发送消息..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }}} />
            </div>
            <button className={`action-btn ${input.trim() || selectedFiles.length > 0 ? 'active-send' : ''}`} onClick={onSend}><Send size={20} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
