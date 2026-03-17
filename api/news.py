"""
财经新闻 API - Vercel Serverless Function
"""
from flask import Flask, jsonify
import requests
import json

app = Flask(__name__)

@app.route('/api/news', methods=['GET'])
def get_news():
    """获取财经新闻（东方财富快讯）"""
    try:
        # 使用东方财富财经快讯 API
        resp = requests.get(
            'https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_50_1_.html',
            timeout=10
        )
        
        # 解析 JSONP 格式：var ajaxResult={...}
        text = resp.text
        if text.startswith('var ajaxResult='):
            json_str = text.replace('var ajaxResult=', '')
            data = json.loads(json_str)
            
            if data.get('LivesList'):
                news_list = []
                for item in data['LivesList'][:20]:
                    news_list.append({
                        'title': item.get('title', ''),
                        'digest': item.get('digest', ''),
                        'url': item.get('url_w', ''),
                        'source': '东方财富',
                        'publish_time': item.get('showtime', '')
                    })
                return jsonify({
                    'success': True,
                    'source': 'eastmoney',
                    'items': news_list
                })
        
        return jsonify({'success': False, 'error': '解析新闻数据失败'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

# Vercel 需要这个 handler
handler = app
