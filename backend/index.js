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

    const apiKey = process.env.API_KEY || parsedConfig.apiKey;
    const rawBaseUrl = process.env.BASE_URL || parsedConfig.baseUrl || 'https://api.openai.com/v1';
    const baseUrl = rawBaseUrl.replace(/\/$/, "");
    const model = parsedConfig.model || process.env.DEFAULT_MODEL || 'gemini-3-flash-preview-thinking';

    if (!apiKey) return res.status(400).json({ error: '未配置 API_KEY' });

    // 处理图片和文件
    const files = req.files;
    let userContent = [];
    
    // 添加文字内容
    const lastText = parsedMessages[parsedMessages.length - 1].content;
    if (lastText) {
      userContent.push({ type: "text", text: lastText });
    }

    // 处理上传的文件
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.mimetype.startsWith('image/')) {
          const base64Image = fs.readFileSync(file.path, { encoding: 'base64' });
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${file.mimetype};base64,${base64Image}` }
          });
        } else {
          userContent.push({ type: "text", text: `\n[文件已上传: ${file.originalname}]` });
        }
        // 清理临时文件
        fs.unlinkSync(file.path);
      }
    }

    // 构造最终的消息数组
    const finalMessages = [
      ...parsedMessages.slice(0, -1),
      { role: 'user', content: userContent.length > 1 ? userContent : lastText }
    ];

    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: finalMessages,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    res.json(response.data);
  } catch (error) {
    console.error('AI Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'AI 响应失败', details: error.message });
  }
});

app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html')));

app.listen(port, '0.0.0.0', () => console.log(`Server running on port ${port}`));
