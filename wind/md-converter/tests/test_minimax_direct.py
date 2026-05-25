import requests

url = 'https://api.bigmodel.cn/api/paas/v4/chat/completions'
api_key = '91308d65d1b842319e98542b7e1a85df.DCbajDVMDVPeNwA4'

data = {
    'model': 'glm-4-flash-250414',
    'messages': [
        {'role': 'user', 'content': '你好，请回复"测试成功"'}
    ],
    'temperature': 0.7
}

print('Testing Minimax API...')
try:
    r = requests.post(url, json=data, headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    }, timeout=60)
    print(f'Status: {r.status_code}')
    r.encoding = 'utf-8'
    print(f'Response: {r.text[:500]}')
except Exception as e:
    print(f'Error: {e}')