import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings, User, Sparkles, Paperclip, X, FileText, Trash2, Clock } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
  timestamp?: number;
}

function App() {
  // 1. 状态管理与历史记录持久化
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gemini_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [config, setConfig] = useState({
    model: 'gemini-3-flash-preview-thinking' // 默认模型
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 2. 自动保存记录到本地
  useEffect(() => {
    localStorage.setItem('gemini_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 3. 清除历史记录
  const clearHistory = () => {
    if (window.confirm('确定要彻底删除所有聊天记录吗？')) {
      setMessages([]);
      localStorage.removeItem('gemini_chat_history');
    }
  };

  const onSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    const userMsg: Message = { 
      role: 'user', 
      content: input, 
      files: selectedFiles.map(f => f.name),
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    const curInput = input;
    const curFiles = [...selectedFiles];
    setInput('');
    setSelectedFiles([]);

    try {
      const fd = new FormData();
      // 只发送消息和模型名，敏感配置(Key/URL)由后端从环境变量读取
      fd.append('messages', JSON.stringify([...messages, { role: 'user', content: curInput }]));
      fd.append('config', JSON.stringify({ model: config.model }));
      curFiles.forEach(f => fd.append('files', f));

      const res = await fetch('/api/chat', { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.choices?.[0]) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.choices[0].message.content,
          timestamp: Date.now()
        }]);
      } else {
        throw new Error(data.error || '接入点响应异常');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ 错误: ${err.message}`,
        timestamp: Date.now()
      }]);
    }
  };

  return (
    <div className="app-container">
      {/* 顶部栏 */}
      <header className="header">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={18} /></div>
          <span>Gemini</span>
        </div>
        <div style={{display: 'flex', gap: '8px'}}>
          <button className="action-btn" title="清除历史" onClick={clearHistory}>
            <Trash2 size={18} />
          </button>
          <button className="action-btn" title="模型设置" onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* 配置面板 - 仅保留模型选择 */}
      {showSettings && (
        <div className="settings-pop">
          <div className="setting-item">
            <label>AI 模型</label>
            <select value={config.model} onChange={e => setConfig({...config, model: e.target.value})}>
              <option value="gemini-3-flash-preview-thinking">gemini-3-flash-preview-thinking (默认)</option>
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              <option value="gemini-3-pro-preview-nothinking">gemini-3-pro-preview-nothinking</option>
              <option value="gemini-3-pro-preview-thinking">gemini-3-pro-preview-thinking</option>
              <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
              <option value="gemini-3.1-pro-preview-thinking">gemini-3.1-pro-preview-thinking</option>
              <option value="gpt-4o">gpt-4o</option>
            </select>
          </div>
          <div style={{fontSize: '11px', color: '#86868b', marginTop: '10px'}}>
            * 敏感配置已加密托管在服务端，确保隐私安全。
          </div>
        </div>
      )}

      {/* 聊天内容区 */}
      <div className="chat-scroll-area" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="welcome-hero">
            <Sparkles size={48} style={{color: '#0071e3', marginBottom: '20px'}} />
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
                    <div style={{display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap'}}>
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

      {/* 底部输入区 */}
      <div className="bottom-area">
        <div className="input-pill">
          <button className="action-btn" onClick={() => fileRef.current?.click()}>
            <Paperclip size={20} />
          </button>
          <input type="file" multiple hidden ref={fileRef} onChange={e => e.target.files && setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)])} />
          
          <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            {selectedFiles.length > 0 && (
              <div style={{display: 'flex', gap: '8px', padding: '5px 0', flexWrap: 'wrap'}}>
                {selectedFiles.map((f, i) => (
                  <div key={i} style={{fontSize: '11px', background: 'rgba(0,113,227,0.1)', color: '#0071e3', padding: '2px 10px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                    {f.name} <X size={12} style={{cursor: 'pointer'}} onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
                  </div>
                ))}
              </div>
            )}
            <textarea 
              rows={1} 
              placeholder="询问 Gemini..." 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }}}
            />
          </div>

          <button className={`action-btn ${input || selectedFiles.length > 0 ? 'send-active' : ''}`} onClick={onSend}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
