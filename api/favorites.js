// 收藏股票 API - 直接调用 Supabase REST API，不依赖 SDK
const SUPABASE_URL = 'https://urtanlfuwsmasiimddje.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QIOJWGSH50tAsYwU1Np60Q_2uMk3Bwn';

// 验证用户 token，返回 user_id
async function getUserId(token) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`
        }
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id || null;
}

// 调用 Supabase PostgREST API
async function pgFetch(path, options = {}, token = null) {
    const url = `${SUPABASE_URL}/rest/v1${path}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    let data;
    try { data = await res.json(); } catch(e) { data = null; }
    return { status: res.status, data };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '请先登录' });
    }

    // 验证用户
    const userId = await getUserId(token);
    if (!userId) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }

    try {
        // 获取收藏列表
        if (req.method === 'GET') {
            const { status, data } = await pgFetch(
                `/favorites?user_id=eq.${userId}&order=created_at.desc`,
                {}, token
            );
            if (status >= 400) throw new Error(data?.message || '获取失败');
            return res.json({ success: true, data: data || [] });
        }

        // 添加收藏
        if (req.method === 'POST') {
            const { ts_code, name, note } = req.body;
            if (!ts_code || !name) {
                return res.status(400).json({ error: '缺少股票代码或名称' });
            }

            // 检查是否已收藏
            const { data: existing } = await pgFetch(
                `/favorites?user_id=eq.${userId}&ts_code=eq.${ts_code}&select=id`,
                {}, token
            );
            if (existing && existing.length > 0) {
                return res.status(409).json({ error: '已在收藏列表中' });
            }

            const { status, data } = await pgFetch('/favorites', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, ts_code, name, note: note || '' })
            }, token);
            
            if (status >= 400) throw new Error(data?.message || data?.details || '添加失败');
            const item = Array.isArray(data) ? data[0] : data;
            return res.json({ success: true, data: item });
        }

        // 删除收藏
        if (req.method === 'DELETE') {
            const { ts_code } = req.body;
            if (!ts_code) {
                return res.status(400).json({ error: '缺少股票代码' });
            }

            const { status, data } = await pgFetch(
                `/favorites?user_id=eq.${userId}&ts_code=eq.${ts_code}`,
                { method: 'DELETE' }, token
            );
            
            if (status >= 400) throw new Error(data?.message || '删除失败');
            return res.json({ success: true });
        }

        return res.status(405).json({ error: '不支持的请求方法' });

    } catch (err) {
        console.error('Favorites error:', err);
        return res.status(500).json({ error: err.message });
    }
}
