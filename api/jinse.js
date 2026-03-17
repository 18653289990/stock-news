// 金色财经快讯 API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const url = 'https://api.jinse.com.cn/noah/v2/lives?reading=false&page=1&limit=30&flag=down&id=0&categories=&noLoading=true';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://jinse.com.cn/lives',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Jinse API error: ${response.status}`);
    }

    const data = await response.json();

    // 展开 list → lives 两层结构
    const items = [];
    for (const group of (data.list || [])) {
      for (const live of (group.lives || [])) {
        items.push({
          id: live.id || '',
          content: live.content || live.title || '',
          time: live.created_at || 0,
          grade: live.grade || 0,  // 金色: 0=普通, 4=重要
        });
      }
    }

    return res.status(200).json({ success: true, items: items.slice(0, 25) });
  } catch (error) {
    console.error('Jinse API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
