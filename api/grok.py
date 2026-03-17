"""
Grok AI API - Vercel Serverless Function
支持文本和图片的多模态对话
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import urllib.request
import urllib.error

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
        except:
            self.send_error_response(400, '无效的请求数据')
            return
        
        user_message = data.get('message', '')
        image_base64 = data.get('image')
        image_type = data.get('imageType', 'jpeg')
        
        if not user_message and not image_base64:
            self.send_error_response(400, '请输入问题或上传图片')
            return
        
        api_key = os.environ.get('XAI_API_KEY')
        if not api_key:
            self.send_error_response(500, '未配置 XAI_API_KEY')
            return
        
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
        try:
            req_data = json.dumps({
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
            
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                self.send_json_response({
                    'success': True,
                    'content': content,
                    'model': result.get('model', model)
                })
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            self.send_error_response(500, f'Grok API 错误: {e.code} - {error_body}')
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            'success': False,
            'error': message
        }).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
