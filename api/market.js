/**
 * /api/market.js
 * 代理 Yahoo Finance 行情接口，获取 A股指数 / 个股实时行情
 * Vercel 境外服务器可访问 Yahoo Finance
 *
 * symbol 映射规则：
 *   sh000001 → 000001.SS  (上证指数)
 *   sz399001 → 399001.SZ  (深证成指)
 *   sz399006 → 399006.SZ  (创业板)
 *   sh600519 → 600519.SS  (沪市股票)
 *   sz000001 → 000001.SZ  (深市股票)
 */

function toYahooSymbol(sym) {
  // 已是 Yahoo 格式 (含 . )
  if (sym.includes('.')) return sym;
  // 腾讯格式 sh/sz 前缀
  if (sym.startsWith('sh')) {
    return sym.slice(2) + '.SS';
  }
  if (sym.startsWith('sz')) {
    return sym.slice(2) + '.SZ';
  }
  if (sym.startsWith('bj')) {
    return sym.slice(2) + '.BJ';
  }
  return sym;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let symbols = [];
  if (req.method === 'GET') {
    const s = req.query?.symbols || '';
    symbols = s.split(',').map(x => x.trim()).filter(Boolean);
  } else {
    symbols = req.body?.symbols || [];
  }

  if (!symbols.length) {
    return res.status(400).json({ success: false, error: 'symbols 不能为空' });
  }

  try {
    const yahooSymbols = symbols.map(toYahooSymbol);
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${yahooSymbols.join(',')}&fields=shortName,regularMarketPrice,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,regularMarketChange,regularMarketChangePercent`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance 返回 ${response.status}`);
    }

    const json = await response.json();
    const quoteList = json?.quoteResponse?.result || [];

    const items = {};
    quoteList.forEach(q => {
      // 反查原始 symbol（sh000001 → 000001.SS → 找回 sh000001）
      const originalSym = symbols.find(s => toYahooSymbol(s) === q.symbol) || q.symbol;
      items[originalSym] = {
        symbol: originalSym,
        name: q.shortName || q.symbol,
        price: q.regularMarketPrice ?? 0,
        preClose: q.regularMarketPreviousClose ?? 0,
        open: q.regularMarketOpen ?? 0,
        high: q.regularMarketDayHigh ?? 0,
        low: q.regularMarketDayLow ?? 0,
        vol: Math.round((q.regularMarketVolume ?? 0) / 100), // 转为手
        amount: 0, // Yahoo 不提供成交额
        change: q.regularMarketChange ?? 0,
        pctChg: q.regularMarketChangePercent ?? 0,
      };
    });

    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('market api error:', error.message);
    return res.status(200).json({ success: false, error: error.message, items: {} });
  }
}
