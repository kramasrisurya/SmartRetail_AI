import urllib.request
import urllib.error
import json
try:
    res = urllib.request.urlopen('http://localhost:8000/api/v1/dashboard/bootstrap')
    data = res.read().decode('utf-8')
    parsed = json.loads(data)
    print("Cameras:", [c['name'] for c in parsed['cameras']])
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print(e)
