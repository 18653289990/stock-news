export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const { message, image, imageType = 'jpeg' } = req.body || {};
    
    console.log('Request body:', req.body);
    console.log('Message:', message);
    console.log('Has image:', !!image);
    
    if (!message && !image) {
      return res.status(400).json({ success: false, error: '请输入问题或上传图片' });
    }
    
    const apiKey = process.env.XAI_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
      return res.status(500).json({ success: false, error: '未配置 XAI_API_KEY' });
    }
    
    // 构建消息内容
    const userContent = [];
    
    if (image) {
      const dataUri = `data:image/${imageType};base64,${image}`;
      userContent.push({
        type: 'image_url',
        image_url: { url: dataUri }
      });
    }
    
    if (message) {
      userContent.push({
        type: 'text',
        text: message
      });
    } else {
      userContent.push({
        type: 'text',
        text: '请分析这张图片的内容'
      });
    }
    
    const model = image ? 'grok-2-vision-1212' : 'grok-4-latest';
    console.log('Using model:', model);
    
    // 调用 Grok API
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的财经分析助手。你擅长分析股票、基金、宏观经济等金融话题。请用中文回答问题。'
          },
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });
    
    console.log('Grok API status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok API error:', errorText);
      return res.status(500).json({ 
        success: false, 
        error: `Grok API 错误: ${response.status} - ${errorText}` 
      });
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    return res.status(200).json({
      success: true,
      content: content,
      model: result.model || model
    });
    
  } catch (error) {
    console.error('Grok API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || '服务器内部错误',
      stack: error.stack
    });
  }
}
