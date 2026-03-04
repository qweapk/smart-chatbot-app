import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Sparkles, Paperclip, X, FileText } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState({
    apiKey: '',
    baseUrl: 'https://globalai.vip/v1',
    model: 'gpt-4o'
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
      } else {
        throw new Error(data.error || 'API 响应异常');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ 错误: ${err.message}` }]);
    }
  };

  return (
    <div className="app-container">
      {/* 顶部 */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={18} /></div>
          <span>Gemini</span>
        </div>
        <button className="action-btn" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={20} />
        </button>
      </header>

      {/* 配置 */}
      {showSettings && (
        <div className="settings-pop">
          <div className="setting-item">
            <label>API Key</label>
            <input type="password" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} placeholder="系统默认配置" />
          </div>
          <div className="setting-item">
            <label>中转地址</label>
            <input type="text" value={config.baseUrl} onChange={e => setConfig({...config, baseUrl: e.target.value})} />
          </div>
          <div className="setting-item">
            <label>选择模型</label>
            <select value={config.model} onChange={e => setConfig({...config, model: e.target.value})}>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gemini-3-flash-preview-thinking">gemini-3-flash-preview-thinking</option>
              <option value="gemini-3.1-pro-preview-thinking">gemini-3.1-pro-preview-thinking</option>
            </select>
          </div>
        </div>
      )}

      {/* 内容区 */}
      <div className="chat-scroll-area" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="welcome-hero">
            <h1>Gemini</h1>
            <p>基于液态玻璃设计的极简助手</p>
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
                    <div style={{display: 'flex', gap: '5px', marginTop: '8px'}}>
                      {m.files.map((f, fi) => (
                        <div key={fi} style={{fontSize: '11px', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '4px'}}>
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
      </div>

      {/* 底部输入框 */}
      <div className="bottom-area">
        <div className="input-pill">
          <button className="action-btn" onClick={() => fileRef.current?.click()}>
            <Paperclip size={20} />
          </button>
          <input type="file" multiple hidden ref={fileRef} onChange={e => e.target.files && setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            {selectedFiles.length > 0 && (
              <div style={{display: 'flex', gap: '8px', padding: '5px 0'}}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{fontSize: '12px', background: '#eee', padding: '2px 10px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                    {f.name} <X size={12} style={{cursor: 'pointer'}} onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            )}
            <textarea 
              rows={1} 
              placeholder="输入消息..." 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }}}
            />
          </div>

          <button className={`action-btn ${input ? 'send-active' : ''}`} onClick={onSend}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
