import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, File, X, Settings, Plus, User, Bot } from 'lucide-react';
import './App.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [config, setConfig] = useState({
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
        throw new Error(data.error || '未知错误');
      }
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ 出错了: ${error.message}`
      }]);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      setSelectedFiles([...selectedFiles, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <div className="app-container" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* 侧边栏：配置面板 */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo"><Bot size={24} /> <span>Smart Bot</span></div>
          <button className="icon-btn" onClick={() => setIsSidebarOpen(false)}><Settings size={20} /></button>
        </div>
        
        <div className="config-section">
          <h3>API 配置</h3>
          <div className="input-group">
            <label>API Key</label>
            <input type="password" value={config.apiKey} onChange={e => setConfig({...config, apiKey: e.target.value})} placeholder="sk-..." />
          </div>
          <div className="input-group">
            <label>中转地址</label>
            <input type="text" value={config.baseUrl} onChange={e => setConfig({...config, baseUrl: e.target.value})} placeholder="https://api..." />
          </div>
          <div className="input-group">
            <label>模型名称</label>
            <select 
              value={config.model} 
              onChange={e => setConfig({...config, model: e.target.value})}
              className="model-select"
            >
              <option value="gpt-4o">gpt-4o (Default)</option>
              <option value="gemini-3-flash-preview-thinking">gemini-3-flash-preview-thinking</option>
              <option value="gemini-3-pro-image-preview">gemini-3-pro-image-preview</option>
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              <option value="gemini-3-pro-preview-nothinking">gemini-3-pro-preview-nothinking</option>
              <option value="gemini-3-pro-preview-thinking">gemini-3-pro-preview-thinking</option>
              <option value="gemini-3.1-flash-image-preview">gemini-3.1-flash-image-preview</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
              <option value="gemini-3.1-pro-preview-thinking">gemini-3.1-pro-preview-thinking</option>
            </select>
          </div>
        </div>

        <button className="new-chat-btn" onClick={() => setMessages([])}>
          <Plus size={18} /> 新建会话
        </button>
      </aside>

      {/* 主聊天区 */}
      <main className="chat-main">
        <header className="chat-header">
          {!isSidebarOpen && <button className="icon-btn" onClick={() => setIsSidebarOpen(true)}><Settings size={20} /></button>}
          <h2>当前会话: {config.model}</h2>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <Bot size={48} className="welcome-icon" />
              <h1>欢迎使用智能机器人</h1>
              <p>在左侧配置 API，上传文件或直接开始对话。</p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`message-row ${m.role}`}>
                <div className="avatar">
                  {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-bubble">
                  <div className="message-content">{m.content}</div>
                  {m.files && m.files.length > 0 && (
                    <div className="message-files">
                      {m.files.map((f, fi) => (
                        <div key={fi} className="file-tag"><File size={12} /> {f}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入与上传区 */}
        <div className={`input-area-wrapper ${isDragging ? 'dragging' : ''}`}>
          {isDragging && <div className="drop-overlay">松开鼠标上传文件</div>}
          
          {selectedFiles.length > 0 && (
            <div className="file-preview-bar">
              {selectedFiles.map((f, i) => (
                <div key={i} className="preview-chip">
                  <File size={14} />
                  <span>{f.name}</span>
                  <button onClick={() => removeFile(i)}><X size={14} /></button>
                </div>
              ))}
            </div>
          )}

          <div className="input-box">
            <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={20} />
            </button>
            <input 
              type="file" 
              multiple 
              hidden 
              ref={fileInputRef} 
              onChange={(e) => handleFileUpload(e.target.files)} 
            />
            <textarea 
              placeholder="输入消息，或拖拽文件到此处..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button className={`send-btn ${input || selectedFiles.length ? 'active' : ''}`} onClick={handleSendMessage}>
              <Send size={20} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
