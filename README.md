# 股票资讯网站 - Vercel 部署指南

## 项目结构

```
stock-news/
├── index.html          # 主页面
├── app.js              # 前端逻辑
├── vercel.json         # Vercel 配置
├── requirements.txt    # Python 依赖
├── server.py           # 本地开发服务器（部署时不用）
└── api/                # Vercel Serverless Functions
    ├── finance.py      # 金融数据代理
    ├── news.py         # 财经新闻
    └── grok.py         # Grok AI 对话
```

## 部署步骤

### 1. 安装 Vercel CLI（可选）

```bash
npm install -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 部署项目

```bash
cd stock-news
vercel
```

或者直接推送到 GitHub，然后在 Vercel 网站上导入项目。

### 4. 配置环境变量

在 Vercel Dashboard 中设置环境变量：

**Settings → Environment Variables:**

| 变量名 | 值 |
|--------|-----|
| `XAI_API_KEY` | 你的 x.ai API Key |

### 5. 重新部署

设置环境变量后，需要重新部署才能生效。

## 本地开发

本地开发仍可使用 server.py：

```bash
cd stock-news
XAI_API_KEY=your-api-key python3 server.py
```

访问 http://localhost:5500

## 功能说明

| API | 功能 | 数据源 |
|-----|------|--------|
| `/api/finance` | 金融数据代理 | Tushare (CodeBuddy) |
| `/api/news` | 财经快讯 | 东方财富 |
| `/api/grok` | Grok AI 对话 | x.ai |

## 注意事项

1. **Grok API 访问**：Vercel 的海外节点可以直接访问 `api.x.ai`，国内用户访问部署后的网站也能使用 Grok 功能

2. **域名**：Vercel 默认提供 `.vercel.app` 域名，也可以绑定自定义域名

3. **冷启动**：Serverless Functions 有冷启动延迟（通常 1-3 秒）

4. **限制**：
   - Vercel 免费版：100GB 带宽/月
   - API 超时：10 秒（Pro 版可延长到 60 秒）
