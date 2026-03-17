// 加密货币实时行情 - CoinGecko 公开 API（无需 key）
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const coins = [
    { id: 'bitcoin',      symbol: 'BTC',  name: 'Bitcoin' },
    { id: 'ethereum',     symbol: 'ETH',  name: 'Ethereum' },
    { id: 'solana',       symbol: 'SOL',  name: 'Solana' },
    { id: 'binancecoin',  symbol: 'BNB',  name: 'BNB' },
    { id: 'ripple',       symbol: 'XRP',  name: 'XRP' },
    { id: 'cardano',      symbol: 'ADA',  name: 'Cardano' },
    { id: 'dogecoin',     symbol: 'DOGE', name: 'Dogecoin' },
    { id: 'avalanche-2',  symbol: 'AVAX', name: 'Avalanche' },
    { id: 'polkadot',     symbol: 'DOT',  name: 'Polkadot' },
    { id: 'chainlink',    symbol: 'LINK', name: 'Chainlink' },
    { id: 'uniswap',      symbol: 'UNI',  name: 'Uniswap' },
    { id: 'litecoin',     symbol: 'LTC',  name: 'Litecoin' },
  ];

  const ids = coins.map(c => c.id).join(',');

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

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
