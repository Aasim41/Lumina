from fastapi import APIRouter

router = APIRouter(prefix="/api/currency", tags=["currency"])

# Hardcoded approximate rates (1 unit = X INR)
RATES = {
    "USD": 83.50,
    "EUR": 91.20,
    "GBP": 106.00,
    "AED": 22.70,
    "SGD": 62.50,
    "JPY": 0.56,
    "THB": 2.38,
    "AUD": 55.80,
    "CAD": 62.00,
    "CHF": 94.50,
}

@router.get("/rates")
async def get_rates():
    return {"base": "INR", "rates": RATES}

@router.get("/convert")
async def convert(amount: float, from_currency: str):
    rate = RATES.get(from_currency.upper(), 1.0)
    return {
        "from_currency": from_currency.upper(),
        "original_amount": amount,
        "rate": rate,
        "inr_amount": round(amount * rate, 2)
    }
