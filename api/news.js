export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    const response = await fetch(
      'https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_50_1_.html'
    );
    
    const text = await response.text();
    
    if (text.startsWith('var ajaxResult=')) {
      const jsonStr = text.replace('var ajaxResult=', '');
      const data = JSON.parse(jsonStr);
      
      if (data.LivesList) {
        const newsList = data.LivesList.slice(0, 20).map(item => ({
          title: item.title || '',
          digest: item.digest || '',
          url: item.url_w || '',
          source: '东方财富',
          publish_time: item.showtime || ''
        }));
        
        return res.status(200).json({
          success: true,
          source: 'eastmoney',
          items: newsList
        });
      }
    }
    
    return res.status(500).json({ success: false, error: '解析新闻数据失败' });
    
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
