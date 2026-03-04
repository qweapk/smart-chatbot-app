import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, File, X, Settings, User, Sparkles, Paperclip } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState({
    apiKey: '',
    baseUrl: 'https://globalai.vip/v1',
    model: 'gpt-4o'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    const newMessage: Message = {
      role: 'user',
      content: input,
      files: selectedFiles.map(f => f.name)
    };

    setMessages([...messages, newMessage]);
    setInput('');
    const currentFiles = [...selectedFiles];
    setSelectedFiles([]);

    try {
      const formData = new FormData();
      formData.append('messages', JSON.stringify([...messages, { role: 'user', content: input }]));
      formData.append('config', JSON.stringify(config));
      currentFiles.forEach(file => formData.append('files', file));

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.choices[0].message.content
        }]);
      } else {
        throw new Error(data.error || '接入点响应异常');
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ 系统响应异常: ${error.message}`
      }]);
    }
  };

  const onFileChange = (files: FileList | null) => {
    if (files) setSelectedFiles([...selectedFiles, ...Array.from(files)]);
  };

  return (
    <div className={`app-container ${isDragging ? 'dragging' : ''}`} 
         onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
         onDragLeave={() => setIsDragging(false)}
         onDrop={(e) => { e.preventDefault(); setIsDragging(false); onFileChange(e.dataTransfer.files); }}>
      
      {/* 顶部栏 */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon"><Sparkles size={16} /></div>
          <span>Gemini</span>
        </div>
        <button className="icon-btn" onClick={() => setShowSettings(!showSettings)}>
          <Settings size={20} />
        </button>
      </header>

      {/* 配置浮层 */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="input-group">
            <label>API Key</label>
            <input type="password" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} placeholder="默认使用系统配置" />
          </div>
          <div className="input-group">
            <label>中转地址</label>
            <input type="text" value={config.baseUrl} onChange={e => setConfig({...config, baseUrl: e.target.value})} />
          </div>
          <div className="input-group">
            <label>模型选择</label>
            <select value={config.model} onChange={e => setConfig({...config, model: e.target.value})}>
              <option value="gpt-4o">gpt-4o</option>
              <option value="gemini-3-flash-preview-thinking">gemini-3-flash-preview-thinking</option>
              <option value="gemini-3.1-pro-preview-thinking">gemini-3.1-pro-preview-thinking</option>
            </select>
          </div>
        </div>
      )}

      {/* 聊天区 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome">
            <h1>有什么可以帮您的？</h1>
            <p>基于液态玻璃设计的智能助手，支持文件拖拽与多模型切换。</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className="avatar">
                {m.role === 'user' ? <User size={18} /> : <Sparkles size={18} />}
              </div>
              <div className="message-bubble">
                {m.content}
                {m.files && m.files.length > 0 && (
                  <div style={{marginTop: '8px', display: 'flex', gap: '4px'}}>
                    {m.files.map((f, fi) => <div key={fi} className="file-chip"><File size={10} /> {f}</div>)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 浮动输入区 */}
      <div className="input-wrapper">
        <div className="file-previews">
          {selectedFiles.map((f, i) => (
            <div key={i} className="file-chip">
              <File size={12} /> {f.name}
              <X size={12} style={{cursor: 'pointer'}} onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </div>
        
        <div className="input-box">
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={20} />
          </button>
          <input type="file" multiple hidden ref={fileInputRef} onChange={(e) => onFileChange(e.target.files)} />
          
          <textarea 
            rows={1}
            placeholder="发送消息或拖拽文件..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
          />
          
          <button className={`icon-btn send-btn ${input ? 'active' : ''}`} onClick={handleSendMessage}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
