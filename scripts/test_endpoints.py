import urllib.request
import urllib.error
import json

endpoints = [
    "/api/v1/dashboard/bootstrap",
    "/api/v1/dashboard/alerts",
    "/api/v1/analytics/heatmap",
    "/api/v1/events?limit=20",
    "/api/v1/audit-log"
]

for ep in endpoints:
    url = f"http://localhost:8000{ep}"
    req = urllib.request.Request(url, headers={'Authorization': 'Bearer test'})
    try:
        res = urllib.request.urlopen(req)
        data = res.read().decode('utf-8')
        print(f"OK {ep} ({len(data)} bytes)")
    except urllib.error.HTTPError as e:
        print(f"ERR {ep} {e.code} {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"ERR {ep} {e}")
