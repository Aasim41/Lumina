import urllib.request
import urllib.error
import json

url = "https://smart-expense-api-rrzq.onrender.com/api/auth/guest"
data = {
    "name": "Test User",
    "age": 25,
    "dob": "1999-01-01",
    "monthly_budget": 5000
}

req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        result = response.read().decode('utf-8')
        print(f"Success: {response.status}")
        print(result)
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
