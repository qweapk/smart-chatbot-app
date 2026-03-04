const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// 配置 CORS
app.use(cors());
app.use(express.json());

// 托管前端打包后的静态文件
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// 聊天 API 转发
app.post('/api/chat', upload.array('files'), async (req, res) => {
  try {
    const { messages, config } = req.body;
    const parsedConfig = config ? JSON.parse(config) : {};

    // 优先使用环境变量，如果前端提供了则使用前端的（方便 UI 调试）
    const apiKey = parsedConfig.apiKey || process.env.API_KEY;
    const baseUrl = (parsedConfig.baseUrl || process.env.BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, "");
    const model = parsedConfig.model || process.env.DEFAULT_MODEL || 'gpt-4o';

    if (!apiKey) {
      return res.status(400).json({ error: '未检测到 API Key，请在 .env 中配置或界面输入' });
    }

    // 处理文件逻辑
    const files = req.files;
    let fileContext = "";
    if (files && files.length > 0) {
      fileContext = `\n\n用户上传了以下文件：${files.map(f => f.originalname).join(', ')}`;
    }

    // 构造请求给 AI 接口
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: [
        ...messages.slice(0, -1),
        { role: 'user', content: messages[messages.length-1].content + fileContext }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error calling AI API:', error.message);
    const errorMsg = error.response?.data?.error?.message || error.message;
    res.status(500).json({ error: 'AI 接口调用失败', details: errorMsg });
  }
});

// 所有非 API 请求都返回前端的 index.html
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
