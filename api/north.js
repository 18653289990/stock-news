/**
 * /api/north.js
 * 北向资金接口（东方财富公开数据）
 * 无需 Token，境外服务器可访问
 *
 * 返回格式：
 * {
 *   success: true,
 *   today: { north, sh, sz, date },   // 今日净流入（亿）
 *   history: [{ date, north, sh, sz }] // 近5日历史
 * }
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // 东方财富：北向资金实时净流入（当日分钟级，取最新一条）
    // fields2: f51=时间, f52=沪股通净流入(亿), f54=深股通净流入(亿), f56=北向合计(亿)
    const url = 'https://push2.eastmoney.com/api/qt/kamt.rtmin/get?fields1=f1,f2,f3,f4&fields2=f51,f52,f54,f56&ut=b2884a393a59ad64002292a3e90d46a5&cb=';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://data.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) throw new Error('eastmoney HTTP ' + response.status);

    const text = await response.text();
    let json;
    // 可能是 JSONP 格式，去掉回调
    const cleaned = text.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
    try { json = JSON.parse(cleaned); } catch { json = JSON.parse(text); }

    const data = json?.data;
    if (!data) throw new Error('no data field');

    // s2 = 沪股通分钟列表, s3 = 深股通分钟列表, s4 = 北向合计分钟列表
    // 每条格式: "HH:MM,value"
    const parseList = (arr) => {
      if (!arr || !arr.length) return [];
      return arr.map(s => {
        const parts = String(s).split(',');
        return { time: parts[0], value: parseFloat(parts[1]) || 0 };
      });
    };

    const shList   = parseList(data.s2);
    const szList   = parseList(data.s3);
    const allList  = parseList(data.s4);

    // 取最新一条
    const latestSh  = shList.length  ? shList[shList.length - 1].value  : 0;
    const latestSz  = szList.length  ? szList[szList.length - 1].value  : 0;
    const latestAll = allList.length ? allList[allList.length - 1].value : (latestSh + latestSz);
    const latestTime = allList.length ? allList[allList.length - 1].time : '--';

    // 历史（近5日）- 使用东方财富日线接口
    // https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=90.BK0760&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=1&end=20500101&lmt=10
    // BK0760 = 北向资金板块
    let history = [];
    try {
      const hUrl = 'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=90.BK0760&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56&klt=101&fqt=1&end=20500101&lmt=10&ut=b2884a393a59ad64002292a3e90d46a5';
      const hRes = await fetch(hUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://data.eastmoney.com/',
        },
        signal: AbortSignal.timeout(5000)
      });
      if (hRes.ok) {
        const hJson = await hRes.json();
        const klines = hJson?.data?.klines || [];
        // 格式: "日期,开,收,高,低,成交量,成交额"
        // 这里用来展示近5日指数走势作参考，北向实际净流是资金流向数据
        // 先用简化方式：直接用北向合计实时数据
      }
    } catch (_) { /* 历史数据可选 */ }

    // 尝试获取近5日北向净流入（东财日历史）
    let historyDays = [];
    try {
      // North flow history: secid=90.HKSGGT for 沪股通大盘
      // 用另一个接口：北向资金大盘净流入历史
      const hUrl2 = 'https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPT_MUTUAL_FUND_SUM&columns=ALL&pageNumber=1&pageSize=5&sortTypes=-1&sortColumns=TRADE_DATE&source=WEB&client=WEB';
      const hRes2 = await fetch(hUrl2, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://data.eastmoney.com/',
        },
        signal: AbortSignal.timeout(5000)
      });
      if (hRes2.ok) {
        const hJson2 = await hRes2.json();
        const rows = hJson2?.result?.data || [];
        historyDays = rows.map(r => ({
          date: r.TRADE_DATE ? r.TRADE_DATE.slice(0, 10) : '--',
          north: parseFloat(r.ALL_MARKET_NORTH_NETBUY) || 0,   // 亿
          sh: parseFloat(r.SH_MARKET_NORTH_NETBUY) || 0,
          sz: parseFloat(r.SZ_MARKET_NORTH_NETBUY) || 0,
        }));
      }
    } catch (_) { /* 历史可选 */ }

    return res.status(200).json({
      success: true,
      today: {
        time: latestTime,
        north: latestAll,
        sh: latestSh,
        sz: latestSz,
      },
      history: historyDays,
      // 分钟级数据（用于更丰富图表，可选）
      minuteData: {
        sh: shList.slice(-20),
        sz: szList.slice(-20),
        all: allList.slice(-20),
      }
    });

  } catch (error) {
    console.error('[north api error]', error.message);
    return res.status(200).json({ success: false, error: error.message });
  }
}
