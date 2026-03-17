// 加密货币实时行情 - CoinGecko 公开 API（无需 key）
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true';
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    const coins = [
      { id: 'bitcoin',     symbol: 'BTC', name: 'Bitcoin' },
      { id: 'ethereum',    symbol: 'ETH', name: 'Ethereum' },
      { id: 'solana',      symbol: 'SOL', name: 'Solana' },
      { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    ];

    const items = coins.map(c => ({
      symbol: c.symbol,
      name: c.name,
      price: data[c.id]?.usd ?? null,
      change24h: data[c.id]?.usd_24h_change ?? null,
    }));

    return res.status(200).json({ success: true, items });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
