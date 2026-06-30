import pandas as pd
from app.services.cleaner import clean_merchant_name, normalize_amount, clean_dataframe

def test_clean_merchant_name():
    assert clean_merchant_name("UBER-123456") == "Uber"
    assert clean_merchant_name("ZOMATO_ORDER_789") == "Zomato Order"
    assert clean_merchant_name("AMAZON INDIA") == "Amazon India"
    assert clean_merchant_name("DOMINOS   PIZZA") == "Dominos Pizza"

def test_normalize_amount():
    assert normalize_amount("1,500.50") == 1500.5
    assert normalize_amount("₹ 500") == 500.0
    assert normalize_amount("-$45.99") == 45.99
    assert normalize_amount(1234) == 1234.0
    assert normalize_amount(None) == 0.0

def test_clean_dataframe():
    data = {
        "Date": ["15/01/2025", "2025-01-16", None],
        "Description": ["UBER-123", "ZOMATO", "TEST"],
        "Amount": ["₹ 1,500", "450.50", "0"]
    }
    df = pd.DataFrame(data)
    
    clean_df = clean_dataframe(df)
    
    assert len(clean_df) == 2
    assert clean_df.iloc[0]["merchant_clean"] == "Uber"
    assert clean_df.iloc[0]["amount"] == 1500.0
    assert clean_df.iloc[1]["merchant_clean"] == "Zomato"
    assert clean_df.iloc[1]["amount"] == 450.5
