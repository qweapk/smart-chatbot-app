const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/dist')));

const upload = multer({ dest: 'uploads/' });

app.post('/api/chat', upload.array('files'), async (req, res) => {
  try {
    const { messages, config } = req.body;
    const parsedMessages = JSON.parse(messages);
    const parsedConfig = config ? JSON.parse(config) : {};

    // --- 核心配置读取逻辑 ---
    // 优先从环境变量读取（确保安全），如果环境没有则看前端传参
    const apiKey = process.env.API_KEY || parsedConfig.apiKey;
    const rawBaseUrl = process.env.BASE_URL || parsedConfig.baseUrl || 'https://api.openai.com/v1';
    const baseUrl = rawBaseUrl.replace(/\/$/, ""); // 移除末尾斜杠
    const model = parsedConfig.model || process.env.DEFAULT_MODEL || 'gemini-3-flash-preview-thinking';

    console.log(`[Chat Request] Model: ${model}, BaseURL: ${baseUrl}, KeyStatus: ${apiKey ? 'Present' : 'Missing'}`);

    if (!apiKey) {
      return res.status(400).json({ error: '服务端未配置 API_KEY，请在 Railway 环境变量中设置。' });
    }

    // 处理文件
    const files = req.files;
    let lastMessageContent = parsedMessages[parsedMessages.length - 1].content;
    if (files && files.length > 0) {
      lastMessageContent += `\n\n(用户上传了文件: ${files.map(f => f.originalname).join(', ')})`;
    }

    const apiMessages = [
      ...parsedMessages.slice(0, -1),
      { role: 'user', content: lastMessageContent }
    ];

    // 请求 AI 接口
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: apiMessages,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });

    res.json(response.data);
  } catch (error) {
    console.error('AI API Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    res.status(500).json({ error: 'AI 接口响应失败', details: errorMessage });
  }
});

// 处理单页应用路由
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Config Check - API_KEY: ${process.env.API_KEY ? 'OK' : 'NOT SET'}`);
  console.log(`Config Check - BASE_URL: ${process.env.BASE_URL || 'DEFAULT'}`);
});
