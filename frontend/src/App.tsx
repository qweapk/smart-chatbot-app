import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Sparkles, Paperclip, X, FileText, Trash2, Plus, MessageSquare, Menu, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: { name: string, url: string, type: string }[];
  thinking?: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

function App() {
  const [chats, setChats] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('gemini_history_v3');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<{ file: File, preview: string }[]>([]);
  const [config, setConfig] = useState({ model: 'gemini-3-flash-preview-thinking' });
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('gemini_history_v3', JSON.stringify(chats));
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chats]);

  const activeChat = chats.find(c => c.id === activeId) || null;
  const messages = activeChat?.messages || [];

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
    }));
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) handleFiles([file] as any);
      }
    }
  };

  const onSend = async () => {
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;
    
    let currentId = activeId;
    if (!currentId) {
      const newId = Date.now().toString();
      const newChat = { id: newId, title: input.slice(0, 15) || '图片对话', messages: [], timestamp: Date.now() };
      setChats([newChat, ...chats]);
      setActiveId(newId);
      currentId = newId;
    }

    const userMsg: Message = { 
      role: 'user', 
      content: input, 
      files: selectedFiles.map(f => ({ name: f.file.name, url: f.preview, type: f.file.type })) 
    };
    
    setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, userMsg] } : c));
    
    const curInput = input;
    const curFiles = selectedFiles.map(f => f.file);
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
        const assistantMsg: Message = {
          role: 'assistant',
          content: data.choices[0].message.content,
          thinking: data.choices[0].thinking
        };
        setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, assistantMsg] } : c));
      }
    } catch (err: any) {
      setChats(prev => prev.map(c => c.id === currentId ? { ...c, messages: [...c.messages, { role: 'assistant', content: `❌ 错误: ${err.message}` }] } : c));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${showSidebar ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={() => { const id = Date.now().toString(); setChats([{ id, title: '新对话', messages: [], timestamp: Date.now() }, ...chats]); setActiveId(id); }}>
            <Plus size={18} /> <span>新建对话</span>
          </button>
        </div>
        <div className="history-list">
          {chats.map(chat => (
            <div key={chat.id} className={`history-item ${activeId === chat.id ? 'active' : ''}`} onClick={() => setActiveId(chat.id)}>
              <MessageSquare size={16} />
              <span className="chat-title">{chat.title}</span>
              <Trash2 className="delete-icon" size={14} onClick={(e) => { e.stopPropagation(); setChats(chats.filter(c => c.id !== chat.id)); }} />
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="left-group">
            <button className="action-btn" onClick={() => setShowSidebar(!showSidebar)}><Menu size={20} /></button>
            <div className="brand"><div className="brand-icon"><Sparkles size={16} /></div><span>Gemini</span></div>
          </div>
          <button className="action-btn" onClick={() => setShowSettings(!showSettings)}><Settings size={20} /></button>
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
            <div className="hero"><h1>Gemini</h1><p>有什么可以帮您的？支持粘贴图片。</p></div>
          ) : (
            <div className="messages-list">
              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role}`}>
                  <div className="avatar">{m.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}</div>
                  <div className="bubble">
                    {m.thinking && (
                      <div className="thinking-section">
                        <div className="thinking-header" onClick={() => {
                          const newSet = new Set(expandedThinking);
                          if (newSet.has(i)) newSet.delete(i); else newSet.add(i);
                          setExpandedThinking(newSet);
                        }}>
                          {expandedThinking.has(i) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          <span>思考过程</span>
                        </div>
                        {expandedThinking.has(i) && (
                          <div className="thinking-content">
                            <ReactMarkdown>{m.thinking}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {m.files && m.files.length > 0 && (
                      <div className="msg-attachments">
                        {m.files.map((f, fi) => (
                          f.type.startsWith('image/') ?
                          <img key={fi} src={f.url} alt="upload" className="msg-image" onClick={() => window.open(f.url)} /> :
                          <div key={fi} className="file-tag"><FileText size={10} /> {f.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="msg-row assistant thinking">
                  <div className="avatar pulse"><Sparkles size={18} /></div>
                  <div className="bubble thinking-bubble"><span className="dot"></span><span className="dot"></span><span className="dot"></span></div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="input-container">
          <div className="input-capsule">
            <button className="action-btn" onClick={() => fileRef.current?.click()}><Paperclip size={20} /></button>
            <input type="file" multiple hidden ref={fileRef} onChange={e => handleFiles(e.target.files)} />
            <div className="textarea-wrapper">
              {selectedFiles.length > 0 && (
                <div className="previews">
                  {selectedFiles.map((f, i) => (
                    <div key={i} className="preview-box">
                      {f.preview ? <img src={f.preview} alt="p" /> : <div className="file-icon"><FileText size={14} /></div>}
                      <X size={12} className="remove-file" onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
                    </div>
                  ))}
                </div>
              )}
              <textarea rows={1} placeholder="发送消息或粘贴图片..." value={input} onPaste={onPaste} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }}} />
            </div>
            <button className={`action-btn ${input.trim() || selectedFiles.length > 0 ? 'active-send' : ''}`} onClick={onSend}><Send size={20} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
