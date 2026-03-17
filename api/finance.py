"""
金融数据 API - Vercel Serverless Function
"""
from http.server import BaseHTTPRequestHandler
import json
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
        except:
            self.send_error_response(400, '无效的请求数据')
            return
        
        api_name = data.get('api_name')
        params = data.get('params', {})
        
        try:
            req_data = json.dumps({
                'api_name': api_name,
                'params': params
            }).encode('utf-8')
            
            req = urllib.request.Request(
                'https://www.codebuddy.cn/v2/tool/financedata',
                data=req_data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                self.send_json_response(result)
                
        except Exception as e:
            self.send_json_response({
                'code': -1,
                'msg': str(e),
                'data': None
            })
    
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
