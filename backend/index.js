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
    const { apiKey, baseUrl, model } = JSON.parse(config);

    // 这里处理文件逻辑，实际应用中你可能需要将文件内容读取并加入 Prompt
    const files = req.files;
    let fileContext = "";
    if (files && files.length > 0) {
      fileContext = `\n\n用户上传了以下文件：${files.map(f => f.originalname).join(', ')}`;
    }

    // 构造请求给 AI 接口
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: [
        ...messages,
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
    res.status(500).json({ error: 'AI 接口调用失败', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
