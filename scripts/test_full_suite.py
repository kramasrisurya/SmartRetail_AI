import urllib.request
import json

base = 'http://localhost:8000/api/v1'

# 1. Login
req = urllib.request.Request(
    f'{base}/auth/login',
    data=json.dumps({'username': 'admin', 'password': 'password'}).encode(),
    headers={'Content-Type': 'application/json'}
)
res = json.loads(urllib.request.urlopen(req).read().decode())
token = res['access_token']
print('[PASS] Login: OK (role:', res['role'], ')')

# 2. Bootstrap
res2 = json.loads(urllib.request.urlopen(f'{base}/dashboard/bootstrap').read().decode())
print(f'[PASS] Bootstrap: {len(res2["cameras"])} cameras, {len(res2["zones"])} zones')

# 3. Alerts
req3 = urllib.request.Request(f'{base}/dashboard/alerts', headers={'Authorization': f'Bearer {token}'})
alerts = json.loads(urllib.request.urlopen(req3).read().decode())
print(f'[PASS] Alerts: {len(alerts)} alerts')
if alerts:
    print('       Sample Alert:', alerts[0]['title'], '| Risk:', alerts[0]['score_value'])

# 4. Heatmap
heat = json.loads(urllib.request.urlopen(f'{base}/analytics/heatmap').read().decode())
print(f'[PASS] Heatmap: {len(heat.get("cells", []))} cells')

# 5. Events
evs = json.loads(urllib.request.urlopen(f'{base}/events?limit=10').read().decode())
print(f'[PASS] Events: {len(evs)} events')

# 6. Journey timeline
tline = json.loads(urllib.request.urlopen(f'{base}/journeys/shopper-17:B222/timeline').read().decode())
print(f'[PASS] Timeline: {len(tline)} steps for shopper-17:B222')

# 7. Assistant
req_a = urllib.request.Request(
    f'{base}/reports/assistant',
    data=json.dumps({'question': 'Why was alert #1 flagged?'}).encode(),
    headers={'Content-Type': 'application/json'}
)
ast = json.loads(urllib.request.urlopen(req_a).read().decode())
ans = ast.get('answer', '') or str(ast)
print(f'[PASS] Assistant: {ans[:70]}...')

print('\nALL SYSTEM CHECKS PASSED!')
