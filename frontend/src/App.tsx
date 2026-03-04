import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Sparkles, Paperclip, X, FileText, Trash2 } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gemini_chat_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState({ model: 'gemini-3-flash-preview-thinking' });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('gemini_chat_v2', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;
    const userMsg: Message = { role: 'user', content: input, files: selectedFiles.map(f => f.name) };
    setMessages(prev => [...prev, userMsg]);
    const curInput = input;
    const curFiles = [...selectedFiles];
    setInput('');
    setSelectedFiles([]);

    try {
      const fd = new FormData();
      fd.append('messages', JSON.stringify([...messages, { role: 'user', content: curInput }]));
      fd.append('config', JSON.stringify(config));
      curFiles.forEach(f => fd.append('files', f));
      const res = await fetch('/api/chat', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.choices?.[0]) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ 发生错误: ${err.message}` }]);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={16} /></div>
          <span>Gemini</span>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button className="action-btn" onClick={() => { if(confirm('清除记录？')) setMessages([]); }}>
            <Trash2 size={18} />
          </button>
          <button className="action-btn" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      {showSettings && (
        <div className="settings-pop">
          <div className="setting-item">
            <label style={{fontSize: '12px', color: '#86868b', display: 'block', marginBottom: '8px'}}>AI 模型</label>
            <select 
              style={{width: '100%', padding: '8px', borderRadius: '10px', border: '1px solid #eee'}}
              value={config.model} 
              onChange={e => setConfig({...config, model: e.target.value})}
            >
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
        </div>
      )}

      <main className="chat-scroll-area" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="hero">
            <h1>Gemini</h1>
            <p style={{color: '#86868b', fontSize: '18px'}}>有什么可以帮您的？</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role}`}>
                <div className="avatar">
                  {m.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
                </div>
                <div className="bubble">
                  {m.content}
                  {m.files && m.files.length > 0 && (
                    <div style={{display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap'}}>
                      {m.files.map((f, fi) => (
                        <div key={fi} style={{fontSize: '11px', background: 'rgba(0,0,0,0.05)', padding: '3px 10px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <FileText size={10} /> {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="bottom-dock">
        <div className="input-capsule">
          <button className="action-btn" onClick={() => fileRef.current?.click()}>
            <Paperclip size={20} />
          </button>
          <input type="file" multiple hidden ref={fileRef} onChange={e => e.target.files && setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            {selectedFiles.length > 0 && (
              <div style={{display: 'flex', gap: '8px', padding: '8px 0', flexWrap: 'wrap'}}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{fontSize: '11px', background: 'rgba(0,113,227,0.1)', color: '#0071e3', padding: '3px 12px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                    {f.name} <X size={12} style={{cursor: 'pointer', opacity: 0.5}} onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            )}
            <textarea 
              rows={1}
              placeholder="发送消息..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }}}
            />
          </div>

          <button className={`action-btn ${input.trim() || selectedFiles.length > 0 ? 'active-send' : ''}`} onClick={onSend}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
