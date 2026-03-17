// ========== 加密货币页面 JS ==========

// 主要展示币种（大卡片）
const MAIN_COINS = [
    { id: 'bitcoin',      symbol: 'BTC',  name: 'Bitcoin',  icon: '₿' },
    { id: 'ethereum',     symbol: 'ETH',  name: 'Ethereum', icon: 'Ξ' },
    { id: 'solana',       symbol: 'SOL',  name: 'Solana',   icon: '◎' },
    { id: 'binancecoin',  symbol: 'BNB',  name: 'BNB',      icon: 'B' },
];

// 更多列表币种（扩充）
const MORE_COINS = [
    { id: 'ripple',           symbol: 'XRP',   name: 'XRP' },
    { id: 'cardano',          symbol: 'ADA',   name: 'Cardano' },
    { id: 'dogecoin',         symbol: 'DOGE',  name: 'Dogecoin' },
    { id: 'tron',             symbol: 'TRX',   name: 'TRON' },
    { id: 'avalanche-2',      symbol: 'AVAX',  name: 'Avalanche' },
    { id: 'polkadot',         symbol: 'DOT',   name: 'Polkadot' },
    { id: 'chainlink',        symbol: 'LINK',  name: 'Chainlink' },
    { id: 'uniswap',          symbol: 'UNI',   name: 'Uniswap' },
    { id: 'litecoin',         symbol: 'LTC',   name: 'Litecoin' },
    { id: 'near',             symbol: 'NEAR',  name: 'NEAR Protocol' },
    { id: 'internet-computer',symbol: 'ICP',   name: 'Internet Computer' },
    { id: 'aptos',            symbol: 'APT',   name: 'Aptos' },
    { id: 'sui',              symbol: 'SUI',   name: 'Sui' },
    { id: 'stellar',          symbol: 'XLM',   name: 'Stellar' },
    { id: 'filecoin',         symbol: 'FIL',   name: 'Filecoin' },
    { id: 'cosmos',           symbol: 'ATOM',  name: 'Cosmos' },
    { id: 'hedera-hashgraph', symbol: 'HBAR',  name: 'Hedera' },
    { id: 'injective-protocol',symbol: 'INJ',  name: 'Injective' },
    { id: 'arbitrum',         symbol: 'ARB',   name: 'Arbitrum' },
    { id: 'optimism',         symbol: 'OP',    name: 'Optimism' },
];

// 保存上一次的价格，用于闪烁对比
let prevPrices = {};

// ========== 工具函数 ==========
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeStr;
    const footer = document.getElementById('footerUpdateTime');
    if (footer) footer.textContent = '数据更新于: ' + timeStr;
}

function formatPrice(price) {
    if (price === null || price === undefined) return '--';
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 1)    return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    return price.toFixed(6);
}

function formatChange(pct) {
    if (pct === null || pct === undefined) return { html: '--', cls: 'crypto-flat' };
    const isUp = pct >= 0;
    const cls = isUp ? 'crypto-up' : 'crypto-down';
    const str = `${isUp ? '+' : ''}${pct.toFixed(2)}%`;
    return { html: str, cls };
}

// ========== Tab 切换 ==========
function switchCryptoTab(tabName) {
    document.querySelectorAll('.crypto-tab-btn').forEach(btn => {
        btn.classList.remove('crypto-tab-active');
        btn.classList.add('bg-gray-100', 'text-gray-700');
        btn.classList.remove('text-white');
    });
    const activeBtn = document.querySelector(`.crypto-tab-btn[data-ctab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('crypto-tab-active');
        activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
    }

    document.querySelectorAll('.crypto-tab-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`cryptoTab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
    if (panel) panel.classList.remove('hidden');
}

// ========== 加载加密货币行情 ==========
async function loadCrypto() {
    try {
        const res = await fetch('/api/crypto');
        const data = await res.json();
        if (!data.success || !data.items) throw new Error('数据异常');

        // 按 symbol 映射数据
        const bySymbol = {};
        data.items.forEach(c => { bySymbol[c.symbol] = c; });

        renderCryptoCards(bySymbol);
        renderCryptoMore(bySymbol);

        const now = new Date();
        document.getElementById('cryptoUpdateTime').textContent =
            '更新于 ' + now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    } catch (e) {
        console.error('loadCrypto error:', e);
        document.getElementById('cryptoCards').innerHTML =
            '<div class="col-span-4 text-center py-8 text-gray-400">行情加载失败，稍后重试</div>';
    }
}

function renderCryptoCards(bySymbol) {
    const container = document.getElementById('cryptoCards');
    container.innerHTML = MAIN_COINS.map(coin => {
        const c = bySymbol[coin.symbol];
        const price = c ? c.price : null;
        const pct = c ? c.change24h : null;
        const { html: pctHtml, cls: pctCls } = formatChange(pct);
        const priceStr = formatPrice(price);

        // 闪烁效果
        const prev = prevPrices[coin.symbol];
        let flashCls = '';
        if (prev !== undefined && price !== null) {
            if (price > prev)      flashCls = 'flash-up';
            else if (price < prev) flashCls = 'flash-down';
        }
        if (price !== null) prevPrices[coin.symbol] = price;

        const isUp = pct !== null && pct >= 0;
        const borderColor = pct === null ? 'border-gray-100'
            : isUp ? 'border-green-100' : 'border-red-100';
        const bgBadge = isUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600';

        return `<div class="card p-4 border ${borderColor} ${flashCls} rounded-xl transition-all hover:shadow-md">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-yellow-50 border border-yellow-200 rounded-full flex items-center justify-center text-sm font-bold text-yellow-600">${coin.icon}</div>
                    <div>
                        <div class="text-sm font-bold text-gray-900">${coin.symbol}</div>
                        <div class="text-xs text-gray-400">${coin.name}</div>
                    </div>
                </div>
                <span class="text-xs px-2 py-0.5 rounded-full font-medium ${bgBadge}">${pctHtml}</span>
            </div>
            <div class="text-2xl font-bold tabular-nums text-gray-900">$${priceStr}</div>
            <div class="text-xs text-gray-400 mt-1">24h涨跌幅</div>
        </div>`;
    }).join('');
}

function renderCryptoMore(bySymbol) {
    const container = document.getElementById('cryptoMoreList');

    const rows = MORE_COINS.map(coin => {
        const c = bySymbol[coin.symbol];
        const price = c ? c.price : null;
        const pct = c ? c.change24h : null;
        const { html: pctHtml, cls: pctCls } = formatChange(pct);
        const priceStr = formatPrice(price);
        const isUp = pct !== null && pct >= 0;
        const arrow = pct === null ? '' : isUp ? '▲' : '▼';

        return `<div class="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
            <div class="flex items-center gap-3">
                <div class="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">${coin.symbol.charAt(0)}</div>
                <div>
                    <span class="text-sm font-medium text-gray-900">${coin.symbol}</span>
                    <span class="text-xs text-gray-400 ml-1.5">${coin.name}</span>
                </div>
            </div>
            <div class="text-right">
                <div class="text-sm font-semibold tabular-nums text-gray-900">$${priceStr}</div>
                <div class="text-xs ${pctCls}">${arrow} ${pctHtml}</div>
            </div>
        </div>`;
    });

    container.innerHTML = rows.length ? rows.join('') : '<div class="text-center py-6 text-gray-400 text-sm">暂无更多数据</div>';
}

// ========== 金色财经快讯 ==========
async function loadJinse() {
    const list = document.getElementById('jinseList');
    list.innerHTML = '<div class="py-3 text-xs text-gray-400 text-center loading"></div>';
    try {
        const res = await fetch('/api/jinse');
        const data = await res.json();
        if (!data.success || !data.items?.length) throw new Error('无数据');

        list.innerHTML = data.items.map(item => {
            const isImportant = item.grade >= 4;
            const gradeClass = isImportant ? 'text-gray-800 font-medium' : 'text-gray-600';
            const gradeTag = isImportant
                ? '<span class="inline-block bg-orange-400 text-white text-xs px-1 py-0.5 rounded mr-1.5 leading-none align-middle">快讯</span>'
                : '';
            const timeStr = item.time ? new Date(item.time * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '';
            return `<div class="py-2 flex gap-2 items-baseline">
                <span class="flex-shrink-0 text-xs text-gray-400 w-10 leading-relaxed">${timeStr}</span>
                <p class="text-xs ${gradeClass} leading-relaxed">${gradeTag}${item.content}</p>
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = '<div class="py-3 text-xs text-gray-400 text-center">加载失败，点右上角刷新重试</div>';
        console.error('loadJinse error:', e);
    }
}

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);

    loadCrypto();
    loadJinse();

    // Tab 切换绑定
    document.querySelectorAll('.crypto-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchCryptoTab(btn.dataset.ctab));
    });

    // 加密货币每60秒刷新
    setInterval(loadCrypto, 60 * 1000);
    // 金色快讯每5分钟刷新
    setInterval(loadJinse, 5 * 60 * 1000);
});
