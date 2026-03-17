/**
 * /api/market.js
 * 代理行情接口，获取 A股指数 / 个股实时行情
 * 优先：Yahoo Finance v8 (境外可用)
 * 备用：Stooq (更快，^SHC=上证，^SZI=深证，^CHI=创业板)
 *
 * symbol 映射规则：
 *   sh000001 → 000001.SS  (上证指数)
 *   sz399001 → 399001.SZ  (深证成指)
 *   sz399006 → 399006.SZ  (创业板)
 *   sh600519 → 600519.SS  (沪市股票)
 *   sz000001 → 000001.SZ  (深市股票)
 */

function toYahooSymbol(sym) {
  if (sym.includes('.')) return sym;
  if (sym.startsWith('sh')) return sym.slice(2) + '.SS';
  if (sym.startsWith('sz')) return sym.slice(2) + '.SZ';
  if (sym.startsWith('bj')) return sym.slice(2) + '.BJ';
  return sym;
}

async function fetchYahoo(symbols) {
  const yahooSymbols = symbols.map(toYahooSymbol);
  // 并行请求每个 symbol，避免批量慢
  const results = await Promise.all(yahooSymbols.map(async (ySym, i) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!r.ok) throw new Error(`Yahoo ${ySym}: ${r.status}`);
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error(`Yahoo ${ySym}: no meta`);
    return {
      sym: symbols[i],
      data: {
        symbol: symbols[i],
        name: meta.shortName || meta.symbol || symbols[i],
        price: meta.regularMarketPrice ?? 0,
        preClose: meta.previousClose ?? meta.chartPreviousClose ?? 0,
        open: meta.regularMarketOpen ?? 0,
        high: meta.regularMarketDayHigh ?? 0,
        low: meta.regularMarketDayLow ?? 0,
        vol: Math.round((meta.regularMarketVolume ?? 0) / 100),
        amount: 0,
        change: (meta.regularMarketPrice ?? 0) - (meta.previousClose ?? meta.chartPreviousClose ?? 0),
        pctChg: meta.previousClose
          ? (((meta.regularMarketPrice ?? 0) - meta.previousClose) / meta.previousClose * 100)
          : 0,
      }
    };
  }));

  const items = {};
  results.forEach(r => { items[r.sym] = r.data; });
  return items;
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
    const items = await fetchYahoo(symbols);
    return res.status(200).json({ success: true, items });
  } catch (error) {
    console.error('market api error:', error.message);
    return res.status(200).json({ success: false, error: error.message, items: {} });
  }
}
