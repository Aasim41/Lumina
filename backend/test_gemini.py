import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
print("API Key:", api_key)

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    response = model.generate_content("Say hi!")
    print("Response:", response.text)
except Exception as e:
    print("Error:", type(e).__name__)
    print("Error details:", str(e))
