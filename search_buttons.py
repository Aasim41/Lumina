import os
import re

def search():
    for root, _, files in os.walk('frontend/src'):
        for f in files:
            if f.endswith('.tsx') or f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    for i, line in enumerate(file):
                        if 'logout' in line.lower() or 'sync' in line.lower():
                            print(f"{path}:{i+1}: {line.strip()}")

search()
