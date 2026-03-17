/**
 * /api/market.js
 * 代理腾讯财经行情接口，获取 A股指数 / 个股实时行情
 * 腾讯接口：https://qt.gtimg.cn/q=<symbol>
 * 格式：sh000001 / sz399001 / sz399006
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // 支持 GET ?symbols=sh000001,sz399001 或 POST { symbols: [...] }
  let symbols = [];
  if (req.method === 'GET') {
    const s = req.query?.symbols || '';
    symbols = s.split(',').map(x => x.trim()).filter(Boolean);
  } else {
    symbols = (req.body?.symbols || []);
  }

  if (!symbols.length) {
    return res.status(400).json({ success: false, error: 'symbols 不能为空' });
  }

  try {
    const url = `https://qt.gtimg.cn/q=${symbols.join(',')}`;
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://finance.qq.com',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`腾讯行情接口返回 ${response.status}`);
    }

    const text = await response.text();
    // 解析腾讯行情格式
    // v_sh000001="1~上证指数~000001~3382.02~3357.99~3357.99~...~..."
    const items = {};
    const lines = text.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const match = line.match(/^v_(\w+)="(.+)"$/);
      if (!match) continue;
      const symbol = match[1];
      const parts = match[2].split('~');

      // 腾讯行情字段索引
      // 0:类型 1:名称 2:代码 3:最新价 4:昨收 5:今开 6:成交量(手) 7:外盘 8:内盘
      // 9:买一 10:买一量 ... 31:今高 32:今低 ...
      // 33:价格/成交(均价) 34:成交量(股) 35:成交额
      // 36:换手率 37:市盈率 38:-- 39:最高 40:最低 41:振幅
      const name = parts[1] || '';
      const price = parseFloat(parts[3]) || 0;
      const preClose = parseFloat(parts[4]) || 0;
      const open = parseFloat(parts[5]) || 0;
      const vol = parseFloat(parts[6]) || 0; // 手
      const high = parseFloat(parts[33]) || parseFloat(parts[39]) || 0;
      const low = parseFloat(parts[34]) || parseFloat(parts[40]) || 0;
      const amount = parseFloat(parts[37]) || 0; // 成交额（元）
      const change = preClose > 0 ? price - preClose : 0;
      const pctChg = preClose > 0 ? (change / preClose) * 100 : 0;

      items[symbol] = {
        symbol,
        name,
        price,
        preClose,
        open,
        high,
        low,
        vol,
        amount,
        change: parseFloat(change.toFixed(3)),
        pctChg: parseFloat(pctChg.toFixed(2))
      };
    }

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('market api error:', error);
    return res.status(200).json({ success: false, error: error.message, items: {} });
  }
}
