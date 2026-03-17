"""
Grok AI API - Vercel Serverless Function
支持文本和图片的多模态对话
"""
import json
import os
import urllib.request
import urllib.error

def handler(event, context):
    """Vercel Python Runtime 入口函数"""
    try:
        # 解析请求体
        if isinstance(event.get('body'), str):
            data = json.loads(event['body'])
        else:
            data = event.get('body', {})
        
        user_message = data.get('message', '')
        image_base64 = data.get('image')
        image_type = data.get('imageType', 'jpeg')
        
        if not user_message and not image_base64:
            return response(400, {'success': False, 'error': '请输入问题或上传图片'})
        
        api_key = os.environ.get('XAI_API_KEY')
        if not api_key:
            return response(500, {'success': False, 'error': '未配置 XAI_API_KEY'})
        
        # 构建消息内容
        user_content = []
        
        if image_base64:
            data_uri = f"data:image/{image_type};base64,{image_base64}"
            user_content.append({
                'type': 'image_url',
                'image_url': {'url': data_uri}
            })
            if not user_message:
                user_message = '请分析这张图片的内容'
        
        if user_message:
            user_content.append({
                'type': 'text',
                'text': user_message
            })
        
        model = 'grok-2-vision-1212' if image_base64 else 'grok-4-latest'
        
        # 调用 Grok API
        req_data = json.dumps({
            'model': model,
            'messages': [
                {
                    'role': 'system',
                    'content': '你是一个专业的财经分析助手。你擅长分析股票、基金、宏观经济等金融话题。请用中文回答问题。'
                },
                {
                    'role': 'user',
                    'content': user_content
                }
            ],
            'temperature': 0.7,
            'max_tokens': 2000
        }).encode('utf-8')
        
        req = urllib.request.Request(
            'https://api.x.ai/v1/chat/completions',
            data=req_data,
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
            
            return response(200, {
                'success': True,
                'content': content,
                'model': result.get('model', model)
            })
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return response(500, {'success': False, 'error': f'Grok API 错误: {e.code}'})
    except Exception as e:
        return response(500, {'success': False, 'error': str(e)})

def response(status_code, body):
    """构建 Vercel 响应格式"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
