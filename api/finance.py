"""
金融数据 API - Vercel Serverless Function
"""
import json
import urllib.request

def handler(event, context):
    """Vercel Python Runtime 入口函数"""
    try:
        # 解析请求体
        if isinstance(event.get('body'), str):
            data = json.loads(event['body'])
        else:
            data = event.get('body', {})
        
        api_name = data.get('api_name')
        params = data.get('params', {})
        
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
        
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return response(200, result)
            
    except Exception as e:
        return response(200, {
            'code': -1,
            'msg': str(e),
            'data': None
        })

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
