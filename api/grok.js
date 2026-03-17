// 最简单的测试版本
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 先返回简单响应测试 API 是否工作
  res.status(200).json({ 
    success: true, 
    message: 'API 工作正常',
    hasApiKey: !!process.env.XAI_API_KEY,
    method: req.method
  });
}
