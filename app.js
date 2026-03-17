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
async function loadMarketIndex() {
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
                
                const closeIdx = fields.indexOf('close');
                const changeIdx = fields.indexOf('change');
                const pctIdx = fields.indexOf('pct_chg');
                
                const close = item[closeIdx];
                const change = item[changeIdx];
                const pctChg = item[pctIdx];
                
                document.getElementById(idx.el[0]).textContent = formatNumber(close);
                document.getElementById(idx.el[1]).innerHTML = 
                    formatPercent(pctChg) + 
                    ` <span class="text-gray-400">${change >= 0 ? '+' : ''}${formatNumber(change)}</span>`;
            }
        } catch (e) {
            console.error('加载指数失败:', idx.name, e);
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
                    <tr class="hover:bg-gray-50 cursor-pointer" onclick="searchStock('${code}')">
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
async function searchStock(code = null) {
    const input = document.getElementById('searchInput');
    let searchCode = code || input.value.trim();
    
    if (!searchCode) {
        alert('请输入股票代码');
        return;
    }
    
    if (/^\d+$/.test(searchCode)) {
        if (searchCode.startsWith('6')) {
            searchCode = searchCode + '.SH';
        } else if (searchCode.startsWith('3') || searchCode.startsWith('0')) {
            searchCode = searchCode + '.SZ';
        } else if (searchCode.startsWith('4') || searchCode.startsWith('8')) {
            searchCode = searchCode + '.BJ';
        }
    }

    const resultDiv = document.getElementById('searchResult');
    resultDiv.innerHTML = '<div class="loading"></div>';

    switchTab('search');

    try {
        const data = await fetchFinanceData('daily', { ts_code: searchCode });
        
        if (data && data.items && data.items[0]) {
            const item = data.items[0];
            const fields = data.fields;
            
            const openIdx = fields.indexOf('open');
            const highIdx = fields.indexOf('high');
            const lowIdx = fields.indexOf('low');
            const closeIdx = fields.indexOf('close');
            const preCloseIdx = fields.indexOf('pre_close');
            const changeIdx = fields.indexOf('change');
            const pctIdx = fields.indexOf('pct_chg');
            const volIdx = fields.indexOf('vol');
            const amountIdx = fields.indexOf('amount');
            
            const open = item[openIdx];
            const high = item[highIdx];
            const low = item[lowIdx];
            const close = item[closeIdx];
            const preClose = item[preCloseIdx];
            const change = item[changeIdx];
            const pctChg = item[pctIdx];
            const vol = item[volIdx];
            const amount = item[amountIdx];
            
            const basicData = await fetchFinanceData('stock_basic', { ts_code: searchCode });
            const name = basicData?.items?.[0]?.[basicData.fields.indexOf('name')] || searchCode;
            const favored = isFavorited(searchCode);
            
            resultDiv.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div>
                        <div class="text-sm text-gray-500 mb-1">股票名称</div>
                        <div class="flex items-center gap-2">
                            <div class="text-xl font-bold text-gray-900">${name}</div>
                            <button class="fav-btn text-xl ${favored ? 'favorited' : ''}" data-code="${searchCode}"
                                onclick="${favored ? `removeFavorite('${searchCode}','${name}')` : `addFavorite('${searchCode}','${name}')`}"
                                title="${favored ? '取消收藏' : '收藏此股票'}">
                                ${favored ? '⭐' : '☆'}
                            </button>
                        </div>
                        <div class="text-sm text-gray-400">${searchCode.split('.')[0]}</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500 mb-1">最新价</div>
                        <div class="text-2xl font-bold ${pctChg >= 0 ? 'stock-up' : 'stock-down'}">${formatNumber(close)}</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500 mb-1">涨跌幅</div>
                        <div class="text-xl font-semibold ${pctChg >= 0 ? 'stock-up' : 'stock-down'}">${pctChg >= 0 ? '+' : ''}${formatNumber(pctChg)}%</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500 mb-1">涨跌额</div>
                        <div class="text-xl font-semibold ${change >= 0 ? 'stock-up' : 'stock-down'}">${change >= 0 ? '+' : ''}${formatNumber(change)}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-gray-500">今开</div>
                        <div class="font-semibold">${formatNumber(open)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-gray-500">最高</div>
                        <div class="font-semibold stock-up">${formatNumber(high)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-gray-500">最低</div>
                        <div class="font-semibold stock-down">${formatNumber(low)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-gray-500">昨收</div>
                        <div class="font-semibold">${formatNumber(preClose)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-gray-500">成交量</div>
                        <div class="font-semibold">${formatVolume(vol * 100)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <div class="text-gray-500">成交额</div>
                        <div class="font-semibold">${formatVolume(amount * 1000)}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 col-span-2">
                        <div class="text-gray-500">交易日期</div>
                        <div class="font-semibold">${item[fields.indexOf('trade_date')]}</div>
                    </div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    未找到相关股票，请检查代码<br>
                    <span class="text-xs">提示：输入6位数字代码，如 000001</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('查询失败:', error);
        resultDiv.innerHTML = '<div class="text-center text-gray-400 py-8">查询失败，请稍后重试</div>';
    }
}

// ========== 北向资金 ==========
let northChart = null;

async function loadNorthMoney() {
    const dataDiv = document.getElementById('northMoneyData');
    const tbody = document.getElementById('northStockBody');
    
    dataDiv.innerHTML = '<div class="loading"></div>';
    tbody.innerHTML = '<tr><td colspan="4" class="loading"></td></tr>';

    try {
        // 使用沪深股通十大成交股接口
        const data = await fetchFinanceData('hsgt_top10', {});
        
        if (data && data.items && data.items.length > 0) {
            const fields = data.fields;
            const todayItems = data.items.filter(item => {
                const dateIdx = fields.indexOf('trade_date');
                return item[dateIdx] === data.items[0][dateIdx];
            });
            
            const dateIdx = fields.indexOf('trade_date');
            const tradeDate = data.items[0][dateIdx];
            
            // 计算总成交额
            const amountIdx = fields.indexOf('amount');
            const totalAmount = todayItems.reduce((sum, item) => sum + (item[amountIdx] || 0), 0);
            
            // 沪股通和深股通分别统计
            const marketIdx = fields.indexOf('market_type');
            const shAmount = todayItems.filter(item => item[marketIdx] === 1).reduce((sum, item) => sum + (item[amountIdx] || 0), 0);
            const szAmount = todayItems.filter(item => item[marketIdx] === 3).reduce((sum, item) => sum + (item[amountIdx] || 0), 0);
            
            dataDiv.innerHTML = `
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="text-sm text-gray-500 mb-1">十大成交总额</div>
                        <div class="text-2xl font-bold text-gray-900">
                            ${formatVolume(totalAmount)}
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="text-sm text-gray-500 mb-1">交易日期</div>
                        <div class="text-2xl font-bold text-gray-900">${tradeDate}</div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="text-sm text-gray-500 mb-1">沪股通成交</div>
                        <div class="text-xl font-semibold text-gray-700">
                            ${formatVolume(shAmount)}
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="text-sm text-gray-500 mb-1">深股通成交</div>
                        <div class="text-xl font-semibold text-gray-700">
                            ${formatVolume(szAmount)}
                        </div>
                    </div>
                </div>
            `;
            
            // 显示十大成交股
            const nameIdx = fields.indexOf('name');
            const codeIdx = fields.indexOf('ts_code');
            const closeIdx = fields.indexOf('close');
            const changeIdx = fields.indexOf('change');
            
            tbody.innerHTML = todayItems.slice(0, 10).map(item => {
                const name = item[nameIdx];
                const code = item[codeIdx].split('.')[0];
                const close = item[closeIdx];
                const change = item[changeIdx];
                const amount = item[amountIdx];
                const market = item[marketIdx] === 1 ? '沪股通' : '深股通';
                
                return `
                    <tr class="hover:bg-gray-50 cursor-pointer" onclick="searchStock('${code}')">
                        <td class="px-4 py-3">
                            <div class="font-medium text-gray-900">${name}</div>
                            <div class="text-xs text-gray-400">${code} · ${market}</div>
                        </td>
                        <td class="text-right px-4 py-3">${formatNumber(amount, 0)}</td>
                        <td class="text-right px-4 py-3">${formatVolume(amount)}</td>
                        <td class="text-right px-4 py-3 ${change >= 0 ? 'stock-up' : 'stock-down'}">${formatNumber(close)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            dataDiv.innerHTML = '<div class="text-center py-4 text-gray-400">暂无北向资金数据</div>';
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">暂无数据</td></tr>';
        }
    } catch (error) {
        console.error('加载北向资金失败:', error);
        dataDiv.innerHTML = '<div class="text-center py-4 text-gray-400">加载失败，请稍后重试</div>';
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-gray-400">加载失败</td></tr>';
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('tab-active');
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.remove('bg-gray-100', 'text-gray-700');

    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');

    switch(tabName) {
        case 'ranking':
            loadRanking(currentRankType);
            break;
        case 'north':
            loadNorthMoney();
            break;
        case 'news':
            loadNews();
            break;
        case 'favorites':
            renderFavoritesTab();
            break;
    }
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);

    loadMarketIndex();
    loadRanking('up');

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll('.rank-type-btn').forEach(btn => {
        btn.addEventListener('click', () => loadRanking(btn.dataset.type));
    });

    document.getElementById('searchBtn').addEventListener('click', () => searchStock());
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchStock();
    });

    setInterval(() => {
        loadMarketIndex();
        const activeTab = document.querySelector('.tab-active').dataset.tab;
        if (activeTab === 'ranking') {
            loadRanking(currentRankType);
        }
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
        <div class="card p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
             onclick="searchStock('${fav.ts_code.split('.')[0]}')">
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

