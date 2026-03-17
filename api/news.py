"""
财经新闻 API - Vercel Serverless Function
"""
import json
import urllib.request

def handler(event, context):
    """Vercel Python Runtime 入口函数"""
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
                
                return response(200, {
                    'success': True,
                    'source': 'eastmoney',
                    'items': news_list
                })
        
        return response(500, {'success': False, 'error': '解析新闻数据失败'})
        
    except Exception as e:
        return response(500, {'success': False, 'error': str(e)})

def response(status_code, body):
    """构建 Vercel 响应格式"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(body, ensure_ascii=False)
    }
