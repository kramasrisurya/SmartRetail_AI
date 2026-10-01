import urllib.request
import re

html = urllib.request.urlopen("http://localhost:8000/dashboard").read().decode("utf-8")
print("HTML Length:", len(html))
print("Has #root:", '<div id="root"></div>' in html)

assets = re.findall(r'src=["\']\./(assets/[^"\']+)["\']', html) + re.findall(r'href=["\']\./(assets/[^"\']+)["\']', html)
print("Assets found in HTML:", assets)

for a in assets:
    try:
        url = f"http://localhost:8000/{a}"
        res = urllib.request.urlopen(url)
        print(f"Loaded {a} -> Status {res.status}, size {len(res.read())} bytes")
    except Exception as e:
        print(f"Failed to load {a}: {e}")
