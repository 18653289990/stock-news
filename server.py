#!/usr/bin/env python3
"""
股票资讯网站后端服务
提供金融数据 API 代理 + 静态文件服务
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
import os
import json

app = Flask(__name__, static_folder='.')
CORS(app)

API_URL = 'https://www.codebuddy.cn/v2/tool/financedata'

@app.route('/')
def index():
    """主页"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """静态文件"""
    return send_from_directory('.', path)

@app.route('/api/finance', methods=['POST'])
def finance_api():
    """代理金融数据 API"""
    try:
        data = request.get_json()
        api_name = data.get('api_name')
        params = data.get('params', {})
        
        response = requests.post(
            API_URL,
            json={
                'api_name': api_name,
                'params': params
            },
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        result = response.json()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'code': -1,
            'msg': str(e),
            'data': None
        })

@app.route('/api/news')
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

@app.route('/api/grok', methods=['POST'])
def grok_api():
    """Grok AI 对话接口（支持文本和图片）"""
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        image_base64 = data.get('image')  # Base64 编码的图片
        image_type = data.get('imageType', 'jpeg')  # 图片类型: jpeg 或 png
        
        if not user_message and not image_base64:
            return jsonify({'success': False, 'error': '请输入问题或上传图片'})
        
        # 从环境变量获取 API Key
        api_key = os.environ.get('XAI_API_KEY')
        if not api_key:
            return jsonify({'success': False, 'error': '未配置 XAI_API_KEY，请设置环境变量'})
        
        # 构建消息内容
        user_content = []
        
        # 如果有图片，添加图片内容（使用 vision 模型）
        if image_base64:
            # 构建 data URI
            data_uri = f"data:image/{image_type};base64,{image_base64}"
            user_content.append({
                'type': 'image_url',
                'image_url': {
                    'url': data_uri
                }
            })
            # 如果没有文字描述，添加默认提示
            if not user_message:
                user_message = '请分析这张图片的内容'
        
        # 添加文本内容
        if user_message:
            user_content.append({
                'type': 'text',
                'text': user_message
            })
        
        # 选择模型：有图片时使用 vision 模型
        model = 'grok-2-vision-1212' if image_base64 else 'grok-4-latest'
        
        # 调用 Grok API
        response = requests.post(
            'https://api.x.ai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model,
                'messages': [
                    {
                        'role': 'system',
                        'content': '你是一个专业的财经分析助手。你擅长分析股票、基金、宏观经济等金融话题。你可以识别和分析K线图、财务报表、新闻截图等图片内容。请用中文回答问题，回答要专业、客观、有见地。'
                    },
                    {
                        'role': 'user',
                        'content': user_content
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 2000
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return jsonify({
                'success': False, 
                'error': f'Grok API 错误: {response.status_code} - {response.text}'
            })
        
        result = response.json()
        content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        return jsonify({
            'success': True,
            'content': content,
            'model': result.get('model', model)
        })
        
    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': '请求超时，请稍后重试'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    print("🚀 股票资讯网站启动中...")
    print("📡 后端服务: http://localhost:5500")
    print("🌐 访问地址: http://localhost:5500")
    app.run(host='0.0.0.0', port=5500, debug=False)
