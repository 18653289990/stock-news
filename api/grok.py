"""
Grok AI API - Vercel Serverless Function
支持文本和图片的多模态对话
"""
from flask import Flask, jsonify, request
import requests
import os

app = Flask(__name__)

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
            return jsonify({'success': False, 'error': '未配置 XAI_API_KEY，请在 Vercel 环境变量中设置'})
        
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

# Vercel 需要这个 handler
handler = app
