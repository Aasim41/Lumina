from datetime import datetime
from dateutil.relativedelta import relativedelta

def forecast_spending(transactions: list) -> dict:
    if not transactions:
        return {
            "predicted_next_month": 0.0,
            "confidence_low": 0.0,
            "confidence_high": 0.0,
            "per_category": [],
            "historical": [],
            "projected": []
        }
        
    # Aggregate by month
    monthly_totals = {}
    category_monthly_totals = {}
    
    for t in transactions:
        month_str = t.date.strftime("%Y-%m")
        monthly_totals[month_str] = monthly_totals.get(month_str, 0) + t.amount
        
        if t.category not in category_monthly_totals:
            category_monthly_totals[t.category] = {}
        category_monthly_totals[t.category][month_str] = category_monthly_totals[t.category].get(month_str, 0) + t.amount

    # Sort months chronologically
    sorted_months = sorted(monthly_totals.keys())
    historical_data = [{"month": m, "amount": monthly_totals[m]} for m in sorted_months]
    
    next_month_date = datetime.strptime(sorted_months[-1], "%Y-%m") + relativedelta(months=1)
    next_month_str = next_month_date.strftime("%Y-%m")
    
    predicted_total = 0.0
    confidence_std = 0.0
    
    n = len(sorted_months)
    if n < 3:
        # Simple Moving Average
        predicted_total = sum(monthly_totals.values()) / n
        confidence_std = predicted_total * 0.1 # Arbitrary 10% for SMA
    else:
        # Linear Regression (pure python)
        x = list(range(n))
        y = [monthly_totals[m] for m in sorted_months]
        
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xx = sum(i * i for i in x)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
        
        predicted_total = slope * n + intercept
        
        # Calculate std deviation of residuals for confidence bounds
        predictions = [slope * i + intercept for i in x]
        residuals = [y[i] - predictions[i] for i in range(n)]
        mean_res = sum(residuals) / n
        variance = sum((r - mean_res)**2 for r in residuals) / n
        confidence_std = variance ** 0.5
        
    # Ensure non-negative prediction
    predicted_total = max(0.0, predicted_total)
    
    # Per-category forecast (using Simple Moving Average for categories for simplicity)
    per_category = []
    for cat, month_data in category_monthly_totals.items():
        cat_total = sum(month_data.values())
        cat_months_active = len(month_data)
        cat_pred = cat_total / cat_months_active if cat_months_active > 0 else 0
        per_category.append({
            "category": cat,
            "predicted_amount": cat_pred
        })
        
    return {
        "predicted_next_month": predicted_total,
        "confidence_low": max(0.0, predicted_total - confidence_std),
        "confidence_high": predicted_total + confidence_std,
        "per_category": per_category,
        "historical": historical_data,
        "projected": [{"month": next_month_str, "amount": predicted_total}]
    }
