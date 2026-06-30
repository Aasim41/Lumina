import pandas as pd
import re

def clean_merchant_name(name: str) -> str:
    if not isinstance(name, str):
        return "Unknown"
        
    # Strip transaction IDs (e.g., -123456, _98765)
    name = re.sub(r'[-_]\d{3,}$', '', name)
    # Replace underscores and hyphens with spaces
    name = name.replace('_', ' ').replace('-', ' ')
    # Remove multiple spaces
    name = re.sub(r'\s+', ' ', name)
    # Title case and strip
    return name.title().strip()

def normalize_amount(amount_val) -> float:
    if pd.isnull(amount_val):
        return 0.0
    if isinstance(amount_val, (int, float)):
        return float(abs(amount_val))
        
    amount_str = str(amount_val).strip()
    # Remove currency symbols and commas
    amount_str = re.sub(r'[^\d.-]', '', amount_str)
    try:
        return float(abs(float(amount_str)))
    except ValueError:
        return 0.0

def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
        
    # Find columns
    cols = [c.lower() for c in df.columns]
    date_col = next((c for c in df.columns if 'date' in c.lower()), None)
    merchant_col = next((c for c in df.columns if any(x in c.lower() for x in ['merchant', 'desc', 'name', 'particulars'])), None)
    amount_col = next((c for c in df.columns if any(x in c.lower() for x in ['amount', 'rs', 'value', 'withdrawal', 'debit'])), None)
    
    if not all([date_col, merchant_col, amount_col]):
        raise ValueError("CSV must contain columns for date, merchant/description, and amount.")
        
    clean_df = pd.DataFrame()
    
    # Parse dates
    clean_df['date'] = pd.to_datetime(df[date_col], dayfirst=True, format='mixed', errors='coerce')
    
    # Clean merchant
    clean_df['merchant_raw'] = df[merchant_col].astype(str)
    clean_df['merchant_clean'] = clean_df['merchant_raw'].apply(clean_merchant_name)
    
    # Normalize amount
    clean_df['amount'] = df[amount_col].apply(normalize_amount)
    
    # Drop rows without valid amount or date
    clean_df = clean_df.dropna(subset=['date', 'amount'])
    clean_df = clean_df[clean_df['amount'] > 0]
    
    return clean_df
