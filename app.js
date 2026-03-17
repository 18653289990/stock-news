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
    
    document.getElementById('updateTime').textContent = '数据更新于: ' + updateTime();
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
                const close = item[closeIdx];
                const pctChg = item[pctIdx];
                const amount = item[amountIdx];
                
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
            
            resultDiv.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div>
                        <div class="text-sm text-gray-500 mb-1">股票名称</div>
                        <div class="text-xl font-bold text-gray-900">${name}</div>
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
    }
}

// ========== 事件绑定 ==========
document.addEventListener('DOMContentLoaded', function() {
    updateTime();
    setInterval(updateTime, 1000);

    loadMarketIndex();
    loadRanking('up');

    // 初始化图片上传功能
    initImageUpload();

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

    document.getElementById('grokBtn').addEventListener('click', () => askGrok());
    document.getElementById('grokInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askGrok();
    });

    setInterval(() => {
        loadMarketIndex();
        const activeTab = document.querySelector('.tab-active').dataset.tab;
        if (activeTab === 'ranking') {
            loadRanking(currentRankType);
        }
    }, 60000);
});

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
    
    // 粘贴上传
    document.addEventListener('paste', (e) => {
        // 只在 Grok Tab 激活时处理粘贴
        const grokTab = document.getElementById('grokTab');
        if (grokTab.classList.contains('hidden')) return;
        
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                handleImageFile(file);
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
        // 检查文件类型
        if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
            alert('请上传 JPG 或 PNG 格式的图片');
            return;
        }
        
        // 检查文件大小 (20MB)
        if (file.size > 20 * 1024 * 1024) {
            alert('图片大小不能超过 20MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            
            // 显示预览
            preview.src = dataUrl;
            previewContainer.classList.remove('hidden');
            placeholder.classList.add('hidden');
            
            // 保存 base64 数据 (去掉 data:image/xxx;base64, 前缀)
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
    const message = input.value.trim();
    
    if (!message && !currentImageBase64) {
        resultDiv.innerHTML = '<div class="text-center text-gray-400">请输入问题或上传图片</div>';
        return;
    }
    
    // 显示加载状态
    resultDiv.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span class="text-purple-500">🤖</span>
            </div>
            <div class="flex-1">
                <div class="text-sm text-gray-500 mb-1">Grok AI 正在思考...</div>
                <div class="loading" style="padding: 10px;"></div>
            </div>
        </div>
    `;
    
    try {
        // 使用 POST 请求
        const requestBody = {message};
        
        // 如果有图片，添加图片数据
        if (currentImageBase64) {
            requestBody.image = currentImageBase64;
            requestBody.imageType = currentImageType;
        }
        
        const response = await fetch('/api/grok', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 格式化回答（简单的 markdown 转 HTML）
            let content = data.content
                .replace(/\n\n/g, '</p><p class="mb-3">')
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            resultDiv.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm">G</span>
                    </div>
                    <div class="flex-1">
                        <div class="text-sm text-gray-500 mb-2">Grok AI · ${data.model}</div>
                        <div class="text-gray-800 leading-relaxed">
                            <p class="mb-3">${content}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // 清空输入框
            input.value = '';
        } else {
            resultDiv.innerHTML = `
                <div class="text-center text-red-500 py-4">
                    <div class="text-2xl mb-2">❌</div>
                    <div>${data.error || '请求失败，请稍后重试'}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Grok API 错误:', error);
        resultDiv.innerHTML = `
            <div class="text-center text-red-500 py-4">
                <div class="text-2xl mb-2">❌</div>
                <div>网络错误，请检查连接</div>
            </div>
        `;
    }
}
