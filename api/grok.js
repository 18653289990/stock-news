// 简单版本 - 只用 GET 请求
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  let message = '';
  let image = null;
  let imageType = 'jpeg';
  
  // GET 请求
  if (req.method === 'GET') {
    message = req.query?.message || '';
    image = req.query?.image || null;
    imageType = req.query?.imageType || 'jpeg';
  } 
  // POST 请求
  else if (req.method === 'POST') {
    message = req.body?.message || '';
    image = req.body?.image || null;
    imageType = req.body?.imageType || 'jpeg';
  }
  
  // 测试模式
  if (!message && !image) {
    return res.status(200).json({ 
      success: true, 
      message: 'API 工作正常',
      hasApiKey: !!process.env.XAI_API_KEY
    });
  }
  
  try {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: '未配置 XAI_API_KEY' });
    }
    
    const userContent = [];
    
    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:image/${imageType};base64,${image}` }
      });
    }
    
    userContent.push({
      type: 'text',
      text: message || '请分析这张图片的内容'
    });
    
    const model = image ? 'grok-2-vision-1212' : 'grok-4-latest';
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: '你是一个专业的财经分析助手。请用中文回答。' },
          { role: 'user', content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      return res.status(500).json({ success: false, error: `Grok API 错误: ${response.status}` });
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    return res.status(200).json({
      success: true,
      content: content,
      model: result.model || model
    });
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
