import datetime
from app.services.forecaster import forecast_spending

class MockTransaction:
    def __init__(self, date, amount, category):
        self.date = date
        self.amount = amount
        self.category = category

def test_forecast_less_than_3_months():
    # Only 2 months of data
    txns = [
        MockTransaction(datetime.date(2025, 1, 15), 1000, "Food & Dining"),
        MockTransaction(datetime.date(2025, 2, 10), 2000, "Food & Dining")
    ]
    
    res = forecast_spending(txns)
    assert res["predicted_next_month"] == 1500.0  # (1000 + 2000) / 2
    assert len(res["historical"]) == 2
    assert len(res["projected"]) == 1
    assert res["projected"][0]["month"] == "2025-03"

def test_forecast_more_than_3_months():
    # 4 months of data with a clear linear trend (1000, 2000, 3000, 4000)
    txns = [
        MockTransaction(datetime.date(2025, 1, 15), 1000, "Food & Dining"),
        MockTransaction(datetime.date(2025, 2, 10), 2000, "Food & Dining"),
        MockTransaction(datetime.date(2025, 3, 5), 3000, "Food & Dining"),
        MockTransaction(datetime.date(2025, 4, 1), 4000, "Food & Dining")
    ]
    
    res = forecast_spending(txns)
    assert res["predicted_next_month"] == 5000.0  # Linear regression should predict exactly 5000
    assert len(res["historical"]) == 4
    assert len(res["projected"]) == 1
    assert res["projected"][0]["month"] == "2025-05"
