// 股票资讯网站 JavaScript - 通过本地后端代理调用金融数据 API

// ========== 配置 ==========
const API_URL = '/api/finance';

// ========== 工具函数 ==========
function formatNumber(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return Number(num).toFixed(decimals);
}

function formatVolume(num) {
    if (!num || isNaN(num)) return '--';
    num = Number(num);
    if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿';
    if (num >= 10000) return (num / 10000).toFixed(2) + '万';
    return num.toString();
}

function formatPercent(num) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    const val = Number(num);
    if (val > 0) return `<span class="stock-up">+${val.toFixed(2)}%</span>`;
    if (val < 0) return `<span class="stock-down">${val.toFixed(2)}%</span>`;
    return `<span class="stock-flat">${val.toFixed(2)}%</span>`;
}

function formatPrice(num, change) {
    if (num === null || num === undefined || isNaN(num)) return '--';
    const val = Number(num).toFixed(2);
    if (change > 0) return `<span class="stock-up">${val}</span>`;
    if (change < 0) return `<span class="stock-down">${val}</span>`;
    return `<span class="stock-flat">${val}</span>`;
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentTime').textContent = timeStr;
    return timeStr;
}

// ========== API 调用 ==========
async function fetchFinanceData(apiName, params = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_name: apiName,
                params: params
            })
        });
        const data = await response.json();
        if (data.code === 0) {
            return data.data;
        } else {
            console.error('API Error:', data.msg);
            return null;
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        return null;
    }
}

// ========== 大盘指数 ==========
// 腾讯行情 symbol 映射
const INDEX_MAP = [
    { symbol: 'sh000001', el: ['shIndex', 'shChange'], name: '上证指数' },
    { symbol: 'sz399001', el: ['szIndex', 'szChange'], name: '深证成指' },
    { symbol: 'sz399006', el: ['cyIndex', 'cyChange'], name: '创业板指' }
];

async function loadMarketIndex() {
    try {
        const symbols = INDEX_MAP.map(i => i.symbol).join(',');
        const res = await fetch(`/api/market?symbols=${symbols}`);
        const data = await res.json();

        if (data.success && data.items) {
            for (const idx of INDEX_MAP) {
                const item = data.items[idx.symbol];
                if (!item) continue;
                document.getElementById(idx.el[0]).textContent = formatNumber(item.price);
                document.getElementById(idx.el[1]).innerHTML =
                    formatPercent(item.pctChg) +
                    ` <span class="text-gray-400">${item.change >= 0 ? '+' : ''}${formatNumber(item.change)}</span>`;
            }
        } else {
            // 回退：使用 Tushare 接口
            await loadMarketIndexFallback();
            return;
        }
    } catch (e) {
        console.error('腾讯行情加载失败，尝试回退:', e);
        await loadMarketIndexFallback();
        return;
    }

    document.getElementById('updateTime').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const footer = document.getElementById('footerUpdateTime');
    if (footer) footer.textContent = '数据更新于: ' + new Date().toLocaleString('zh-CN');
}

// 回退方案：Tushare
async function loadMarketIndexFallback() {
    const indices = [
        { ts_code: '000001.SH', el: ['shIndex', 'shChange'], name: '上证指数' },
        { ts_code: '399001.SZ', el: ['szIndex', 'szChange'], name: '深证成指' },
        { ts_code: '399006.SZ', el: ['cyIndex', 'cyChange'], name: '创业板指' }
    ];
    for (const idx of indices) {
        try {
            const data = await fetchFinanceData('index_daily', { ts_code: idx.ts_code });
            if (data && data.items && data.items[0]) {
                const item = data.items[0];
                const fields = data.fields;
                const close = item[fields.indexOf('close')];
                const change = item[fields.indexOf('change')];
                const pctChg = item[fields.indexOf('pct_chg')];
                document.getElementById(idx.el[0]).textContent = formatNumber(close);
                document.getElementById(idx.el[1]).innerHTML =
                    formatPercent(pctChg) +
                    ` <span class="text-gray-400">${change >= 0 ? '+' : ''}${formatNumber(change)}</span>`;
            }
        } catch (e) {
            console.error('加载指数失败(fallback):', idx.name, e);
        }
    }
    document.getElementById('updateTime').textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const footer = document.getElementById('footerUpdateTime');
    if (footer) footer.textContent = '数据更新于: ' + new Date().toLocaleString('zh-CN');
}

// ========== 加密货币行情 ==========
async function loadCrypto() {
    const row = document.getElementById('cryptoRow');
    try {
        const res = await fetch('/api/crypto');
        const data = await res.json();
        if (!data.success || !data.items) throw new Error('数据异常');

        row.innerHTML = data.items.map((c, i) => {
            const pct = c.change24h;
            const isUp = pct >= 0;
            const pctClass = isUp ? 'stock-up' : 'stock-down';
            const pctStr = pct !== null ? `${isUp ? '+' : ''}${pct.toFixed(2)}%` : '--';
            const priceStr = c.price !== null
                ? (c.price >= 1000 ? c.price.toLocaleString('en-US', {maximumFractionDigits: 0})
                    : c.price >= 1 ? c.price.toFixed(2) : c.price.toFixed(4))
                : '--';
            const borderClass = i === 0 ? '' : 'pl-3';
            return `
                <div class="${borderClass}">
                    <div class="text-xs text-gray-500 mb-0.5 font-medium">${c.symbol}</div>
                    <div class="text-base font-bold tabular-nums">$${priceStr}</div>
                    <div class="text-xs mt-0.5 <span class="${pctClass}">${pctStr}</span>"></div>
                </div>`;
        }).join('');

        // 修正：单独渲染涨跌幅
        row.innerHTML = data.items.map((c, i) => {
            const pct = c.change24h;
            const isUp = pct !== null && pct >= 0;
            const pctClass = pct === null ? 'text-gray-400' : isUp ? 'stock-up' : 'stock-down';
            const pctStr = pct !== null ? `${isUp ? '+' : ''}${pct.toFixed(2)}%` : '--';
            const priceStr = c.price !== null
                ? (c.price >= 1000 ? c.price.toLocaleString('en-US', {maximumFractionDigits: 0})
                    : c.price >= 1 ? c.price.toFixed(2) : c.price.toFixed(4))
                : '--';
            const borderClass = i === 0 ? 'pr-3' : 'px-3';
            return `<div class="${borderClass}">
                <div class="text-xs text-gray-500 mb-0.5 font-medium">${c.symbol}</div>
                <div class="text-sm font-bold tabular-nums leading-tight">$${priceStr}</div>
                <div class="text-xs mt-0.5 ${pctClass}">${pctStr}</div>
            </div>`;
        }).join('');
    } catch (e) {
        row.innerHTML = '<div class="text-xs text-gray-400">加载失败</div>';
        console.error('loadCrypto error:', e);
    }
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
            const timeStr = item.time ? new Date(item.time * 1000).toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}) : '';
            return `<div class="py-1.5 flex gap-2 items-baseline">
                <span class="flex-shrink-0 text-xs text-gray-400 w-10 leading-relaxed">${timeStr}</span>
                <p class="text-xs ${gradeClass} leading-relaxed">${gradeTag}${item.content}</p>
            </div>`;
        }).join('');
    } catch (e) {
        list.innerHTML = '<div class="py-3 text-xs text-gray-400 text-center">加载失败，点右上角刷新重试</div>';
        console.error('loadJinse error:', e);
    }
}

// ========== 涨跌幅排行 ==========
let currentRankType = 'up';

async function loadRanking(type = 'up') {
    currentRankType = type;
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = '<tr><td colspan="6" class="loading"></td></tr>';

    document.querySelectorAll('.rank-type-btn').forEach(btn => {
        btn.classList.remove('bg-blue-500', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    document.querySelector(`.rank-type-btn[data-type="${type}"]`).classList.remove('bg-gray-100', 'text-gray-700');
    document.querySelector(`.rank-type-btn[data-type="${type}"]`).classList.add('bg-blue-500', 'text-white');

    try {
        const data = await fetchFinanceData('limit_list_d', {});
        
        if (data && data.items && data.items.length > 0) {
            const fields = data.fields;
            const nameIdx = fields.indexOf('name');
            const codeIdx = fields.indexOf('ts_code');
            const closeIdx = fields.indexOf('close');
            const pctIdx = fields.indexOf('pct_chg');
            const amountIdx = fields.indexOf('amount');
            const limitIdx = fields.indexOf('limit');
            
            let filteredItems = data.items;
            if (type === 'up') {
                filteredItems = data.items.filter(item => item[limitIdx] === 'U').slice(0, 20);
            } else if (type === 'down') {
                filteredItems = data.items.filter(item => item[limitIdx] === 'D').slice(0, 20);
            } else {
                filteredItems = [...data.items].sort((a, b) => b[amountIdx] - a[amountIdx]).slice(0, 20);
            }
            
            tbody.innerHTML = filteredItems.map(item => {
                const name = item[nameIdx];
                const code = item[codeIdx].split('.')[0];
                const tsCode = item[codeIdx];
                const close = item[closeIdx];
                const pctChg = item[pctIdx];
                const amount = item[amountIdx];
                const favored = isFavorited(tsCode);
                
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-3">
                            <div class="font-medium text-gray-900">${name}</div>
                            <div class="text-xs text-gray-400">${code}</div>
                        </td>
                        <td class="text-right px-4 py-3">${formatPrice(close, pctChg)}</td>
                        <td class="text-right px-4 py-3">${formatPercent(pctChg)}</td>
                        <td class="text-right px-4 py-3 ${pctChg >= 0 ? 'stock-up' : 'stock-down'}">${formatNumber(close * pctChg / 100)}</td>
                        <td class="text-right px-4 py-3 text-gray-600">--</td>
                        <td class="text-right px-4 py-3 text-gray-600">${formatVolume(amount)}</td>
                        <td class="text-right px-4 py-3">
                            <button class="fav-btn ${favored ? 'favorited' : ''}" data-code="${tsCode}"
                                onclick="event.stopPropagation(); ${favored ? `removeFavorite('${tsCode}','${name}')` : `addFavorite('${tsCode}','${name}')`}"
                                title="${favored ? '取消收藏' : '收藏'}">
                                ${favored ? '⭐' : '☆'}
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">暂无数据</td></tr>';
        }
    } catch (error) {
        console.error('加载排行失败:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-400">加载失败，请稍后重试</td></tr>';
    }
}

// ========== 个股查询 ==========
// 将 ts_code 转成腾讯行情 symbol
function tsCodeToQQSymbol(tsCode) {
    const [code, market] = tsCode.split('.');
    if (market === 'SH') return 'sh' + code;
    if (market === 'SZ') return 'sz' + code;
    if (market === 'BJ') return 'bj' + code;
    return 'sh' + code;
}

// ========== 北向资金 ==========
let northChart = null;

async function loadNorthMoney() {
    const dataDiv = document.getElementById('northMoneyData');
    const tbody = document.getElementById('northStockBody');

    dataDiv.innerHTML = '<div class="loading"></div>';
    tbody.innerHTML = '<tr><td colspan="4" class="loading"></td></tr>';

    // 并行：东方财富北向 + Tushare 十大成交股
    try {
        const [northRes, top10Data] = await Promise.all([
            fetch('/api/north').then(r => r.json()).catch(() => null),
            fetchFinanceData('hsgt_top10', {})
        ]);

        // ---- 左侧：资金流向概况（东方财富） ----
        if (northRes && northRes.success && northRes.today) {
            const { today, history } = northRes;
            const northNet = today.north;
            const shNet    = today.sh;
            const szNet    = today.sz;

            const netColor = v => Number(v) >= 0 ? 'text-red-500' : 'text-green-600';
            const netSign  = v => Number(v) >= 0 ? '+' : '';
            const fmt      = v => (v !== null && v !== undefined && !isNaN(v))
                ? `${netSign(v)}${Number(v).toFixed(2)}亿`
                : '--';

            dataDiv.innerHTML = `
                <div class="grid grid-cols-3 gap-2 text-center">
                    <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-xs text-gray-400 mb-0.5">北向合计</div>
                        <div class="text-base font-bold ${netColor(northNet)}">${fmt(northNet)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-xs text-gray-400 mb-0.5">沪股通</div>
                        <div class="text-base font-bold ${netColor(shNet)}">${fmt(shNet)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-2">
                        <div class="text-xs text-gray-400 mb-0.5">深股通</div>
                        <div class="text-base font-bold ${netColor(szNet)}">${fmt(szNet)}</div>
                    </div>
                </div>
                <div class="text-xs text-gray-400 mt-1 text-right">截至 ${today.time || '--'}</div>
            `;

            // ---- 右侧：近5日趋势图 ----
            let labels, values;

            if (history && history.length >= 2) {
                // 有历史数据：用日历史
                const recent5 = history.slice(0, 5).reverse();
                labels = recent5.map(r => r.date.slice(5)); // MM-DD
                values = recent5.map(r => r.north);
            } else {
                // 无历史：用当日分钟级数据（最近20分钟）
                const minuteAll = northRes.minuteData?.all || [];
                const sampled = minuteAll.length > 6
                    ? minuteAll.filter((_, i) => i % Math.ceil(minuteAll.length / 6) === 0).slice(0, 6)
                    : minuteAll;
                labels = sampled.map(r => r.time);
                values = sampled.map(r => r.value);
            }

            const canvas = document.getElementById('northChart');
            if (canvas && labels.length > 0) {
                if (northChart) northChart.destroy();
                const ctx = canvas.getContext('2d');
                northChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [{
                            label: '北向净流入(亿)',
                            data: values,
                            backgroundColor: values.map(v => v >= 0 ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'),
                            borderColor:     values.map(v => v >= 0 ? '#ef4444' : '#22c55e'),
                            borderWidth: 1,
                            borderRadius: 4,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: ctx => `${ctx.raw >= 0 ? '+' : ''}${ctx.raw.toFixed(2)}亿`
                                }
                            }
                        },
                        scales: {
                            y: {
                                grid: { color: 'rgba(0,0,0,0.05)' },
                                ticks: { font: { size: 11 }, callback: v => `${v}亿` }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 11 } }
                            }
                        }
                    }
                });
            }
        } else {
            // 东方财富失败，尝试 Tushare 备用
            const flowData = await fetchFinanceData('moneyflow_hsgt', {});
            if (flowData && flowData.items && flowData.items.length > 0) {
                const ff = flowData.fields;
                const latest = flowData.items[0];
                const findField = (...candidates) => {
                    for (const name of candidates) {
                        const idx = ff.indexOf(name);
                        if (idx !== -1) return latest[idx];
                    }
                    return null;
                };
                const tradeDate = findField('trade_date');
                const northNet  = findField('north_money', 'north_net') ?? 0;
                const shNet     = findField('sh_money', 'hgt_net') ?? 0;
                const szNet     = findField('sz_money', 'sgt_net') ?? 0;

                const netColor = v => Number(v) >= 0 ? 'text-red-500' : 'text-green-600';
                const fmt      = v => `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}亿`;

                dataDiv.innerHTML = `
                    <div class="grid grid-cols-3 gap-2 text-center">
                        <div class="bg-gray-50 rounded-lg p-2">
                            <div class="text-xs text-gray-400 mb-0.5">北向合计</div>
                            <div class="text-base font-bold ${netColor(northNet)}">${fmt(northNet)}</div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-2">
                            <div class="text-xs text-gray-400 mb-0.5">沪股通</div>
                            <div class="text-base font-bold ${netColor(shNet)}">${fmt(shNet)}</div>
                        </div>
                        <div class="bg-gray-50 rounded-lg p-2">
                            <div class="text-xs text-gray-400 mb-0.5">深股通</div>
                            <div class="text-base font-bold ${netColor(szNet)}">${fmt(szNet)}</div>
                        </div>
                    </div>
                    <div class="text-xs text-gray-400 mt-1 text-right">交易日：${tradeDate || '--'}</div>
                `;
            } else {
                dataDiv.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">暂无北向资金数据</div>';
            }
        }

        // ---- 十大成交股表格（Tushare） ----
        if (top10Data && top10Data.items && top10Data.items.length > 0) {
            const tf = top10Data.fields;
            const todayItems = top10Data.items.filter(item =>
                item[tf.indexOf('trade_date')] === top10Data.items[0][tf.indexOf('trade_date')]
            );
            const nameIdx   = tf.indexOf('name');
            const codeIdx   = tf.indexOf('ts_code');
            const closeIdx  = tf.indexOf('close');
            const changeIdx = tf.indexOf('change');
            const amountIdx = tf.indexOf('amount');
            const marketIdx = tf.indexOf('market_type');

            tbody.innerHTML = todayItems.slice(0, 10).map(item => {
                const name   = item[nameIdx] || '--';
                const code   = (item[codeIdx] || '').split('.')[0];
                const close  = item[closeIdx];
                const change = item[changeIdx];
                const amount = item[amountIdx];
                const mType  = item[marketIdx];
                const market = (mType === 1 || mType === '1') ? '沪' : '深';
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-3 py-2">
                            <span class="font-medium text-gray-900">${name}</span>
                            <span class="text-xs text-gray-400 ml-1">${code}·${market}</span>
                        </td>
                        <td class="text-right px-3 py-2 text-sm">${formatVolume(amount)}</td>
                        <td class="text-right px-3 py-2 text-sm ${Number(change) >= 0 ? 'stock-up' : 'stock-down'}">${Number(change) >= 0 ? '+' : ''}${formatNumber(change)}</td>
                        <td class="text-right px-3 py-2 text-sm ${Number(change) >= 0 ? 'stock-up' : 'stock-down'}">${formatNumber(close)}</td>
                    </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-400 text-sm">暂无数据</td></tr>';
        }
    } catch (error) {
        console.error('加载北向资金失败:', error);
        dataDiv.innerHTML = '<div class="text-center py-4 text-gray-400 text-sm">加载失败，请稍后重试</div>';
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-gray-400 text-sm">加载失败</td></tr>';
    }
}

// ========== 财经新闻 ==========
async function loadNews() {
    const listDiv = document.getElementById('newsList');
    listDiv.innerHTML = '<div class="loading"></div>';

    try {
        // 调用后端新闻接口（东方财富财经快讯）
        const response = await fetch('/api/news');
        const data = await response.json();
        
        if (data.success && data.items && data.items.length > 0) {
            listDiv.innerHTML = `
                <div class="p-4 bg-green-50 text-green-600 text-sm mb-2">
                    📰 财经快讯（数据来源：东方财富）
                </div>
                ${data.items.map((item, index) => `
                    <a href="${item.url}" target="_blank" class="news-item block p-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <div class="flex gap-4">
                            <div class="flex-shrink-0 w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                                ${index + 1}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-gray-900 mb-1">${item.title}</div>
                                ${item.digest ? `<div class="text-sm text-gray-500 mb-1 line-clamp-2">${item.digest}</div>` : ''}
                                <div class="text-xs text-gray-400">${item.source} · ${item.publish_time || ''}</div>
                            </div>
                        </div>
                    </a>
                `).join('')}
            `;
        } else {
            showFallbackNews(listDiv);
        }
    } catch (error) {
        console.error('加载新闻失败:', error);
        showFallbackNews(listDiv);
    }
}

function showFallbackNews(listDiv) {
    listDiv.innerHTML = `
        <div class="p-4 bg-yellow-50 text-yellow-600 text-sm mb-2">
            ⚠️ 新闻加载失败，请稍后刷新重试
        </div>
        <div class="p-4 bg-gray-50">
            <div class="text-gray-500 text-sm mb-2">推荐访问更多财经资讯：</div>
            <div class="flex gap-4 flex-wrap">
                <a href="https://www.jin10.com" target="_blank" class="text-blue-500 hover:underline text-sm">金十数据</a>
                <a href="https://finance.sina.com.cn" target="_blank" class="text-blue-500 hover:underline text-sm">新浪财经</a>
                <a href="https://www.jinse.com" target="_blank" class="text-blue-500 hover:underline text-sm">金色财经</a>
                <a href="https://www.cls.cn" target="_blank" class="text-blue-500 hover:underline text-sm">财联社</a>
            </div>
        </div>
    `;
}

// ========== Tab 切换 ==========
function switchTab(tabName) {
    try {
        // 移除所有按钮的活跃状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('tab-active');
            btn.classList.add('bg-gray-100', 'text-gray-700');
        });
        
        // 激活当前按钮
        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('tab-active');
            activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
        } else {
            console.warn(`Tab button not found for: ${tabName}`);
        }
        
        // 隐藏所有面板
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        // 显示目标面板
        const targetPanel = document.getElementById(`${tabName}Tab`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            // 如果是推荐操作标签，自动聚焦搜索框
            if (tabName === 'recommendation') {
                setTimeout(() => {
                    const recInput = document.getElementById('recInput');
                    if (recInput) {
                        recInput.focus();
                    }
                }, 100);
            }
        } else {
            console.warn(`Tab panel not found for: ${tabName}Tab`);
            return;
        }
        
        // 加载对应 tab 的数据
        switch(tabName) {
            case 'north':
                loadNorthMoney();
                break;
            case 'news':
                loadNews();
                break;
            case 'favorites':
                renderFavoritesTab();
                break;
            case 'recommendation':
                // 推荐操作 tab 不需要初始加载
                break;
            case 'search':
                // 查询 tab 不需要初始加载
                break;
        }
    } catch (error) {
        console.error('Tab switching error:', error);
    }
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);

    loadMarketIndex();

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // 今日推荐操作事件绑定
    document.getElementById('recBtn').addEventListener('click', () => getTradeRecommendation());
    document.getElementById('recInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') getTradeRecommendation();
    });

    setInterval(() => {
        loadMarketIndex();
    }, 60000);

    // 初始化认证状态
    initAuth();

    // 点击外部关闭用户菜单
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('userMenuGroup');
        if (!menu.contains(e.target)) {
            document.getElementById('userDropdown').classList.add('hidden');
        }
    });
    
    // 添加推荐操作样式
    addRecommendationStyles();
});

// ========== 认证状态管理 ==========
let currentUser = null;
let authToken = null;
let userFavorites = []; // 缓存收藏列表

function initAuth() {
    // 从 localStorage 恢复登录状态
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
        // 后台验证 token 是否还有效
        verifyToken();
    }
}

async function verifyToken() {
    try {
        const res = await fetch('/api/auth?action=me', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (!data.success) {
            // token 过期，清除状态
            clearAuthState();
        }
    } catch (e) {
        // 网络问题，保持现状
    }
}

function updateAuthUI() {
    const btnGroup = document.getElementById('authBtnGroup');
    const userGroup = document.getElementById('userMenuGroup');

    if (currentUser) {
        btnGroup.classList.add('hidden');
        userGroup.classList.remove('hidden');
        const email = currentUser.email || '';
        document.getElementById('userEmailDisplay').textContent = email;
        document.getElementById('userEmailFull').textContent = email;
        document.getElementById('userAvatar').textContent = email.charAt(0).toUpperCase();
    } else {
        btnGroup.classList.remove('hidden');
        userGroup.classList.add('hidden');
    }
}

function clearAuthState() {
    currentUser = null;
    authToken = null;
    userFavorites = [];
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    updateAuthUI();
}

// ========== 模态框控制 ==========
let currentAuthTab = 'login';

function openAuthModal(tab = 'login') {
    document.getElementById('authModal').classList.remove('hidden');
    switchAuthTab(tab);
}

function closeAuthModal() {
    document.getElementById('authModal').classList.add('hidden');
    // 清空输入
    ['loginEmail','loginPassword','signupEmail','signupPassword','signupPasswordConfirm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('signupError').classList.add('hidden');
    document.getElementById('signupSuccess').classList.add('hidden');
}

function switchAuthTab(tab) {
    currentAuthTab = tab;
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginBtn = document.getElementById('loginTabBtn');
    const signupBtn = document.getElementById('signupTabBtn');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        loginBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
        loginBtn.classList.remove('text-gray-500');
        signupBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        signupBtn.classList.add('text-gray-500');
    } else {
        signupForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        signupBtn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
        signupBtn.classList.remove('text-gray-500');
        loginBtn.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        loginBtn.classList.add('text-gray-500');
    }
}

// ========== 登录 ==========
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errEl = document.getElementById('loginError');

    errEl.classList.add('hidden');

    if (!email || !password) {
        errEl.textContent = '请填写邮箱和密码';
        errEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/auth?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            authToken = data.session?.access_token;
            currentUser = data.user;
            localStorage.setItem('auth_token', authToken);
            localStorage.setItem('auth_user', JSON.stringify(currentUser));
            updateAuthUI();
            closeAuthModal();
            // 预加载收藏列表
            loadFavoritesData();
        } else {
            errEl.textContent = data.error || '登录失败，请检查邮箱和密码';
            errEl.classList.remove('hidden');
        }
    } catch (e) {
        errEl.textContent = '网络错误，请稍后重试';
        errEl.classList.remove('hidden');
    }
}

// ========== 注册 ==========
async function handleSignup() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupPasswordConfirm').value;
    const errEl = document.getElementById('signupError');
    const successEl = document.getElementById('signupSuccess');

    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    if (!email || !password) {
        errEl.textContent = '请填写邮箱和密码';
        errEl.classList.remove('hidden');
        return;
    }
    if (password.length < 6) {
        errEl.textContent = '密码至少需要6位';
        errEl.classList.remove('hidden');
        return;
    }
    if (password !== confirm) {
        errEl.textContent = '两次密码输入不一致';
        errEl.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch('/api/auth?action=signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (data.success) {
            if (data.session) {
                // 注册后直接登录
                authToken = data.session.access_token;
                currentUser = data.user;
                localStorage.setItem('auth_token', authToken);
                localStorage.setItem('auth_user', JSON.stringify(currentUser));
                updateAuthUI();
                closeAuthModal();
                showToast('注册成功，已自动登录');
                loadFavoritesData();
            } else {
                // 理论上不应走到这里（已关闭邮件验证）
                successEl.textContent = '注册成功！请登录';
                successEl.classList.remove('hidden');
                // 自动切换到登录 tab
                setTimeout(() => switchAuthTab('login'), 1500);
            }
        } else {
            errEl.textContent = data.error || '注册失败，请稍后重试';
            errEl.classList.remove('hidden');
        }
    } catch (e) {
        errEl.textContent = '网络错误，请稍后重试';
        errEl.classList.remove('hidden');
    }
}

// ========== 退出 ==========
async function handleLogout() {
    document.getElementById('userDropdown').classList.add('hidden');
    try {
        await fetch('/api/auth?action=logout', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch (e) { /* 忽略错误 */ }
    clearAuthState();
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}

function switchToFavTab() {
    document.getElementById('userDropdown').classList.add('hidden');
    switchTab('favorites');
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    const favBtn = document.querySelector('.tab-btn[data-tab="favorites"]');
    if (favBtn) {
        favBtn.classList.add('tab-active');
        favBtn.classList.remove('bg-gray-100', 'text-gray-700');
    }
}

// ========== 收藏功能 ==========

// 渲染收藏 Tab 主界面
function renderFavoritesTab() {
    const loginRequired = document.getElementById('favLoginRequired');
    const favContent = document.getElementById('favContent');

    if (!currentUser) {
        loginRequired.classList.remove('hidden');
        favContent.classList.add('hidden');
    } else {
        loginRequired.classList.add('hidden');
        favContent.classList.remove('hidden');
        loadFavorites();
    }
}

// 从服务端加载收藏列表
async function loadFavorites() {
    if (!currentUser || !authToken) return;

    const listDiv = document.getElementById('favList');
    listDiv.innerHTML = '<div class="loading"></div>';

    try {
        const res = await fetch('/api/favorites', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();

        if (data.success) {
            userFavorites = data.data || [];
            renderFavoritesList();
        } else {
            listDiv.innerHTML = `<div class="text-center text-gray-400 py-8">${data.error || '加载失败'}</div>`;
        }
    } catch (e) {
        listDiv.innerHTML = '<div class="text-center text-gray-400 py-8">加载失败，请稍后重试</div>';
    }
}

// 仅加载数据到缓存（不更新 UI）
async function loadFavoritesData() {
    if (!currentUser || !authToken) return;
    try {
        const res = await fetch('/api/favorites', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success) {
            userFavorites = data.data || [];
        }
    } catch (e) { /* 忽略 */ }
}

function renderFavoritesList() {
    const listDiv = document.getElementById('favList');
    const countEl = document.getElementById('favCount');
    countEl.textContent = `(${userFavorites.length} 只)`;

    if (userFavorites.length === 0) {
        listDiv.innerHTML = `
            <div class="card p-12 text-center">
                <div class="text-5xl mb-4">📋</div>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">还没有收藏</h3>
                <p class="text-gray-500 text-sm">在涨跌幅排行或个股查询中点击 ⭐ 收藏股票</p>
            </div>
        `;
        return;
    }

    listDiv.innerHTML = userFavorites.map(fav => `
        <div class="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                    ${fav.name.charAt(0)}
                </div>
                <div>
                    <div class="font-semibold text-gray-900">${fav.name}</div>
                    <div class="text-sm text-gray-400">${fav.ts_code}</div>
                    ${fav.note ? `<div class="text-xs text-gray-500 mt-0.5">${fav.note}</div>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="text-xs text-gray-400">${new Date(fav.created_at).toLocaleDateString('zh-CN')}</div>
                <button onclick="event.stopPropagation(); removeFavorite('${fav.ts_code}', '${fav.name}')"
                    class="text-red-400 hover:text-red-600 transition-colors p-1" title="取消收藏">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// 检查某只股票是否已收藏
function isFavorited(tsCode) {
    return userFavorites.some(f => f.ts_code === tsCode);
}

// 添加收藏
async function addFavorite(tsCode, name) {
    if (!currentUser) {
        openAuthModal('login');
        return;
    }

    try {
        const res = await fetch('/api/favorites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ ts_code: tsCode, name })
        });
        const data = await res.json();

        if (data.success) {
            userFavorites.push(data.data);
            updateFavBtns(tsCode, true);
            showToast(`已收藏 ${name}`);
        } else {
            showToast(data.error === '已在收藏列表中' ? `${name} 已在收藏列表` : data.error, 'error');
        }
    } catch (e) {
        showToast('操作失败，请重试', 'error');
    }
}

// 删除收藏
async function removeFavorite(tsCode, name) {
    if (!currentUser || !authToken) return;

    try {
        const res = await fetch('/api/favorites', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ ts_code: tsCode })
        });
        const data = await res.json();

        if (data.success) {
            userFavorites = userFavorites.filter(f => f.ts_code !== tsCode);
            updateFavBtns(tsCode, false);
            showToast(`已取消收藏 ${name}`);
            // 如果当前在收藏 tab，重新渲染列表
            const favTab = document.getElementById('favoritesTab');
            if (!favTab.classList.contains('hidden')) {
                renderFavoritesList();
            }
        } else {
            showToast(data.error || '操作失败', 'error');
        }
    } catch (e) {
        showToast('操作失败，请重试', 'error');
    }
}

// 更新页面中所有相同股票的收藏按钮状态
function updateFavBtns(tsCode, favorited) {
    document.querySelectorAll(`.fav-btn[data-code="${tsCode}"]`).forEach(btn => {
        if (favorited) {
            btn.textContent = '⭐';
            btn.classList.add('favorited');
            btn.title = '取消收藏';
        } else {
            btn.textContent = '☆';
            btn.classList.remove('favorited');
            btn.title = '收藏';
        }
    });
}

// Toast 提示
function showToast(msg, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-medium text-white z-50 transition-all shadow-lg ${
        type === 'error' ? 'bg-red-500' : 'bg-gray-800'
    }`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}


// ========== Grok AI 图片处理 ==========
let currentImageBase64 = null;
let currentImageType = null;

// 初始化图片上传功能
function initImageUpload() {
    const dropZone = document.getElementById('imageDropZone');
    const imageInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const removeBtn = document.getElementById('removeImageBtn');
    const imageToggle = document.getElementById('grokImageToggle');
    const imageBar = document.getElementById('grokImageBar');

    // 图片区折叠按钮
    imageToggle.addEventListener('click', () => {
        const hidden = imageBar.classList.toggle('hidden');
        imageToggle.classList.toggle('border-purple-400', !hidden);
        imageToggle.classList.toggle('text-purple-500', !hidden);
    });

    // 点击上传
    dropZone.addEventListener('click', () => imageInput.click());
    
    // 文件选择
    imageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleImageFile(e.target.files[0]);
        }
    });
    
    // 拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-purple-400', 'bg-purple-50');
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-400', 'bg-purple-50');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-purple-400', 'bg-purple-50');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });
    
    // 粘贴上传（全局监听，不限 Tab）
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                // 自动展开图片区
                imageBar.classList.remove('hidden');
                imageToggle.classList.add('border-purple-400', 'text-purple-500');
                handleImageFile(item.getAsFile());
                break;
            }
        }
    });
    
    // 移除图片
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImagePreview();
    });
    
    // 处理图片文件
    function handleImageFile(file) {
        if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
            alert('请上传 JPG 或 PNG 格式的图片');
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('图片大小不能超过 20MB');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            preview.src = dataUrl;
            previewContainer.classList.remove('hidden');
            placeholder.classList.add('hidden');
            currentImageBase64 = dataUrl.split(',')[1];
            currentImageType = file.type === 'image/png' ? 'png' : 'jpeg';
        };
        reader.readAsDataURL(file);
    }
    
    function clearImagePreview() {
        currentImageBase64 = null;
        currentImageType = null;
        imageInput.value = '';
        previewContainer.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
}

// ========== 今日推荐操作 ==========
async function getTradeRecommendation() {
    const input = document.getElementById('recInput').value.trim();
    const resultDiv = document.getElementById('recResult');
    
    if (!input) {
        resultDiv.innerHTML = '<div class="text-center text-red-500 py-8">请输入股票代码或名称</div>';
        return;
    }
    
    // 获取持仓状态和交易周期
    const holdingStatus = document.querySelector('input[name="holdingStatus"]:checked').value;
    const timeframe = document.getElementById('timeframe').value;
    
    // 显示加载状态
    resultDiv.innerHTML = `
        <div class="flex items-center justify-center gap-2">
            <div class="loading" style="padding:10px;"></div>
            <span class="text-gray-600">Grok AI 正在分析 ${input}...</span>
        </div>
    `;
    
    try {
        // 先获取股票基本信息（用于获取准确的名称）
        let stockInfo = input;
        try {
            const marketRes = await fetch(`/api/market?symbols=${input}`);
            const marketData = await marketRes.json();
            if (marketData.success && marketData.items) {
                const firstItem = Object.values(marketData.items)[0];
                if (firstItem) stockInfo = firstItem.name || input;
            }
        } catch (e) {
            // 市场数据获取失败，继续使用原始输入
        }
        
        // 准备 Grok 提示词，融入持仓状态和交易周期
        const prompt = `我输入的股票代码是：${input}。
我的持仓状态是：${holdingStatus}
我的交易周期是：${timeframe}

请你分析这只股票，然后直接告诉我，如果是你（考虑我的持仓状态和${timeframe}交易周期），你今天的操作是买入，卖出，还是继续持有或观望。

请用以下格式回答：
【建议】买入/卖出/持有/观望
【理由】[你的分析理由，不超过3行]`;
        
        // 调用 Grok API，指定使用 grok-4-latest 模型
        const response = await fetch('/api/grok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, model: 'grok-4-latest' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const content = data.content;
            // 格式化输出
            const formatted = content
                .replace(/\n\n/g, '</p><p class="mb-3">')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-blue-600">$1</strong>')
                .replace(/【建议】(买入|卖出|持有|观望)/g, '<div class="text-lg font-bold mt-3 mb-2">【建议】<span class="$1-color">$1</span></div>')
                .replace(/【理由】/g, '<div class="text-sm font-semibold text-gray-700 mt-2">【理由】</div><div class="text-sm text-gray-600 leading-relaxed">');
            
            resultDiv.innerHTML = `
                <div class="space-y-4 px-2 md:px-0">
                    <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 md:p-4 border border-blue-100">
                        <div class="text-sm text-gray-600 mb-2">📊 分析参数</div>
                        <div class="flex flex-wrap gap-3">
                            <div class="text-sm">
                                <span class="text-gray-500">股票：</span>
                                <span class="font-bold text-gray-900">${input}</span>
                            </div>
                            <div class="text-sm">
                                <span class="text-gray-500">持仓：</span>
                                <span class="font-bold text-gray-900">${holdingStatus}</span>
                            </div>
                            <div class="text-sm">
                                <span class="text-gray-500">周期：</span>
                                <span class="font-bold text-gray-900">${timeframe}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-lg p-3 md:p-4 border border-gray-200">
                        <div class="flex items-start gap-2 md:gap-3">
                            <div class="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mt-0.5">
                                <span class="text-white text-xs font-bold">G</span>
                            </div>
                            <div class="flex-1 min-w-0 overflow-hidden">
                                <div class="text-sm leading-relaxed break-words">${formatted}</div>
                                <div class="text-xs text-gray-400 mt-3">💡 Grok AI 分析 • ${new Date().toLocaleTimeString('zh-CN')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `<div class="text-center text-red-500 py-8">${data.error || '分析失败，请稍后重试'}</div>`;
        }
    } catch (error) {
        console.error('推荐操作错误:', error);
        resultDiv.innerHTML = `<div class="text-center text-red-500 py-8">网络错误，请检查连接</div>`;
    }
}

// ========== 今日推荐操作 CSS 增强 ==========
// 在 document.addEventListener('DOMContentLoaded') 中动态添加样式
function addRecommendationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .买入-color { color: #ef4444; font-weight: bold; }
        .卖出-color { color: #22c55e; font-weight: bold; }
        .持有-color { color: #f59e0b; font-weight: bold; }
        .观望-color { color: #6b7280; font-weight: bold; }
    `;
    document.head.appendChild(style);
}

// ========== Grok AI ==========
async function askGrok() {
    const input = document.getElementById('grokInput');
    const resultDiv = document.getElementById('grokResult');
    const resultContent = document.getElementById('grokResultContent');
    const message = input.value.trim();
    
    if (!message && !currentImageBase64) {
        input.focus();
        return;
    }
    
    // 展开结果区，显示加载
    resultDiv.classList.remove('hidden');
    resultContent.innerHTML = `
        <div class="flex items-center gap-2 text-gray-400 text-sm">
            <div class="loading" style="padding:6px;"></div>
            <span>Grok AI 正在思考…</span>
        </div>
    `;
    
    try {
        let response;
        if (currentImageBase64) {
            response = await fetch('/api/grok', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, image: currentImageBase64, imageType: currentImageType })
            });
        } else {
            const params = new URLSearchParams();
            params.append('message', message);
            response = await fetch('/api/grok?' + params.toString());
        }
        
        const data = await response.json();
        
        if (data.success) {
            let content = data.content
                .replace(/\n\n/g, '</p><p class="mb-2">')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            resultContent.innerHTML = `
                <div class="flex items-start gap-2">
                    <div class="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mt-0.5">
                        <span class="text-white text-xs font-bold">G</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="mb-2">${content}</p>
                        <div class="text-xs text-gray-400 mt-2">${data.model}</div>
                    </div>
                </div>
            `;
            input.value = '';
        } else {
            resultContent.innerHTML = `<div class="text-red-500 text-sm">${data.error || '请求失败，请稍后重试'}</div>`;
        }
    } catch (error) {
        console.error('Grok API 错误:', error);
        resultContent.innerHTML = `<div class="text-red-500 text-sm">网络错误，请检查连接</div>`;
    }
}

