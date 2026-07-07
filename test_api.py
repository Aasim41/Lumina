import urllib.request
import json

url = "https://smart-expense-api-rrzq.onrender.com/api/auth/guest"
data = json.dumps({
    "name": "Test User",
    "age": 25,
    "dob": "1999-01-01",
    "monthly_budget": 5000
}).encode("utf-8")

req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

try:
    with urllib.request.urlopen(req) as response:
        print("Status:", response.status)
        print("Response:", response.read().decode("utf-8"))
except Exception as e:
    print("Error:", e)
