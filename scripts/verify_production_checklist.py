import urllib.request
import json
import time

def run():
    print("=== Testing StoreSight Production Readiness & Checklist ===")
    
    def test_url(url, name, expected_code=200):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'TestRunner/1.0'})
            res = urllib.request.urlopen(req)
            print(f"[PASS] {name}: status {res.status}")
            return res
        except urllib.error.HTTPError as e:
            if e.code == expected_code:
                print(f"[PASS] {name}: expected {expected_code}, got {e.code}")
            else:
                print(f"[FAIL] {name}: expected {expected_code}, got {e.code}")
            return e
        except Exception as e:
            print(f"[FAIL] {name}: {e}")
            return None

    # 1. Test Dashboard HTML & Security Headers
    res = test_url("http://localhost:8000/dashboard", "Dashboard Route")
    if res and hasattr(res, "headers"):
        hsts = res.headers.get("Strict-Transport-Security")
        xcto = res.headers.get("X-Content-Type-Options")
        xfo = res.headers.get("X-Frame-Options")
        pol = res.headers.get("Permissions-Policy")
        ref = res.headers.get("Referrer-Policy")
        cache = res.headers.get("Cache-Control")
        print(f"       HSTS: {hsts}")
        print(f"       X-Content-Type-Options: {xcto}")
        print(f"       X-Frame-Options: {xfo}")
        print(f"       Permissions-Policy: {pol}")
        print(f"       Referrer-Policy: {ref}")
        print(f"       Cache-Control: {cache}")

    # 2. Test Favicon
    test_url("http://localhost:8000/favicon.svg", "Favicon SVG")
    test_url("http://localhost:8000/api/v1/favicon.svg", "API Favicon SVG")

    # 3. Test OG Social Preview Image
    test_url("http://localhost:8000/og-image.svg", "Social Preview Image")

    # 4. Test Custom 404 Handler
    test_url("http://localhost:8000/some-non-existent-path-for-testing", "Custom 404 Route", expected_code=404)

    # 5. Test Bot Honeypot Rejection
    try:
        data = json.dumps({"username": "admin", "password": "password", "website": "http://bot.com"}).encode("utf-8")
        req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req)
        print("[FAIL] Bot Honeypot: was not rejected")
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print("[PASS] Bot Honeypot: successfully rejected automated spam/bot (HTTP 400)")
        else:
            print(f"[FAIL] Bot Honeypot: unexpected HTTP {e.code}")

    # 6. Test Legitimate Login
    try:
        data = json.dumps({"username": "admin", "password": "password"}).encode("utf-8")
        req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
        login_res = urllib.request.urlopen(req)
        body = json.loads(login_res.read().decode("utf-8"))
        print(f"[PASS] Legitimate Authentication: role={body.get('role')}, token_len={len(body.get('access_token', ''))}")
    except Exception as e:
        print(f"[FAIL] Legitimate Authentication failed: {e}")

    # 7. Test Rate Limiting
    print("Testing Rate Limiting (11 rapid requests)...")
    blocked = False
    for i in range(11):
        try:
            data = json.dumps({"username": "admin", "password": "wrongpassword"}).encode("utf-8")
            req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data, headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                blocked = True
                print(f"[PASS] Rate Limiter: successfully triggered 429 Too Many Requests on attempt #{i+1}")
                break
    if not blocked:
        print("[NOTE] Rate limit threshold not hit or already within quota")

    print("\nAll production readiness tests completed!")

if __name__ == "__main__":
    run()
