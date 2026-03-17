// Supabase 认证 API - 直接调用 Supabase REST API，不依赖 SDK
const SUPABASE_URL = 'https://urtanlfuwsmasiimddje.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_QIOJWGSH50tAsYwU1Np60Q_2uMk3Bwn';

async function supabaseFetch(path, options = {}) {
    const url = `${SUPABASE_URL}${path}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    return { status: res.status, data };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
        // 注册
        if (action === 'signup' && req.method === 'POST') {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: '邮箱和密码不能为空' });
            }
            const { status, data } = await supabaseFetch('/auth/v1/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (status >= 400) {
                const errMsg = data.msg || data.error_description || '';
                const friendlyMsg = errMsg.includes('invalid') ? '邮箱格式不正确' :
                                    errMsg.includes('already') ? '该邮箱已注册，请直接登录' :
                                    errMsg.includes('rate') ? '操作过于频繁，请稍后再试' : '注册失败，请稍后重试';
                return res.status(400).json({ error: friendlyMsg });
            }
            return res.json({ success: true, user: data.user, session: data.session });
        }

        // 登录
        if (action === 'login' && req.method === 'POST') {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: '邮箱和密码不能为空' });
            }
            const { status, data } = await supabaseFetch('/auth/v1/token?grant_type=password', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (status >= 400) return res.status(400).json({ error: '邮箱或密码错误，请重新检查' });
            return res.json({
                success: true,
                user: data.user,
                session: { access_token: data.access_token }
            });
        }

        // 退出
        if (action === 'logout' && req.method === 'POST') {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                await supabaseFetch('/auth/v1/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            return res.json({ success: true });
        }

        // 获取当前用户
        if (action === 'me' && req.method === 'GET') {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (!token) return res.status(401).json({ error: '未登录' });

            const { status, data } = await supabaseFetch('/auth/v1/user', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (status >= 400) return res.status(401).json({ error: '登录已过期' });
            return res.json({ success: true, user: data });
        }

        return res.status(400).json({ error: '未知操作' });

    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: err.message });
    }
}
