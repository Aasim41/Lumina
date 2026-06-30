import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'smart_expense.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN last_budget_update DATE;")
except sqlite3.OperationalError as e:
    print("Column last_budget_update already exists or error:", e)

conn.commit()
conn.close()
print("Migration completed.")
