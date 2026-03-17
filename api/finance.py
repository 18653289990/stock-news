"""
金融数据 API - Vercel Serverless Function
"""
from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

API_URL = 'https://www.codebuddy.cn/v2/tool/financedata'

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

# Vercel 需要这个 handler
handler = app
