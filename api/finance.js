export default async function handler(req, res) {
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
    const { api_name, params } = req.body;
    
    const response = await fetch('https://www.codebuddy.cn/v2/tool/financedata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_name, params })
    });
    
    const result = await response.json();
    return res.status(200).json(result);
    
  } catch (error) {
    return res.status(200).json({
      code: -1,
      msg: error.message,
      data: null
    });
  }
}
