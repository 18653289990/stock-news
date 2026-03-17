// Vercel Edge Function 格式
export const runtime = 'edge';

export default async function handler(req) {
  // 处理 CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  // GET 请求 - 测试或简单查询
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const message = url.searchParams.get('message') || '';
    const image = url.searchParams.get('image');
    const imageType = url.searchParams.get('imageType') || 'jpeg';
    
    if (!message && !image) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'API 工作正常',
        hasApiKey: !!process.env.XAI_API_KEY
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return await callGrokAPI(message, image, imageType);
  }
  
  // POST 请求
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const message = body?.message || '';
      const image = body?.image || null;
      const imageType = body?.imageType || 'jpeg';
      
      if (!message && !image) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '请输入问题或上传图片' 
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
      return await callGrokAPI(message, image, imageType);
    } catch (e) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '解析请求失败: ' + e.message 
      }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
  
  return new Response(JSON.stringify({ 
    success: false, 
    error: 'Method not allowed' 
  }), {
    status: 405,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

async function callGrokAPI(message, image, imageType) {
  const apiKey = process.env.XAI_API_KEY;
  
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: '未配置 XAI_API_KEY' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
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
  
  userContent.push({
    type: 'text',
    text: message || '请分析这张图片的内容'
  });
  
  const model = image ? 'grok-2-vision-1212' : 'grok-4-latest';
  
  try {
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
            content: '你是一个专业的财经分析助手。请用中文回答问题。'
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
    
    if (!response.ok) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Grok API 错误: ${response.status}` 
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    
    return new Response(JSON.stringify({
      success: true,
      content: content,
      model: result.model || model
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
