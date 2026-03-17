"""
财经新闻 API - Vercel Serverless Function
"""
from http.server import BaseHTTPRequestHandler
import json
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            with urllib.request.urlopen(
                'https://newsapi.eastmoney.com/kuaixun/v1/getlist_102_ajaxResult_50_1_.html',
                timeout=10
            ) as resp:
                text = resp.read().decode('utf-8')
            
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
                    
                    self.send_json_response({
                        'success': True,
                        'source': 'eastmoney',
                        'items': news_list
                    })
                    return
            
            self.send_error_response(500, '解析新闻数据失败')
            
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
