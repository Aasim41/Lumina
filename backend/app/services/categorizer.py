import os
import logging

logger = logging.getLogger(__name__)

try:
    import joblib
    HAS_JOBLIB = True
except ImportError:
    HAS_JOBLIB = False

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "ml", "model.pkl")
_model = None

def load_model():
    global _model
    if HAS_JOBLIB and os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            logger.info("ML categorization model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")
            _model = None
    else:
        logger.warning(f"ML model not found at {MODEL_PATH}. Falling back to basic categorization.")

def basic_categorize(merchant: str) -> str:
    merchant = merchant.lower()
    if any(x in merchant for x in ['zomato', 'swiggy', 'mcdonalds', 'kfc', 'pizza', 'restaurant']):
        return 'Food & Dining'
    elif any(x in merchant for x in ['netflix', 'spotify', 'amazon prime', 'hotstar', 'movie', 'cinema']):
        return 'Entertainment'
    elif any(x in merchant for x in ['amazon', 'flipkart', 'myntra', 'shopping', 'store', 'mall']):
        return 'Shopping'
    elif any(x in merchant for x in ['uber', 'ola', 'irctc', 'petrol', 'flight', 'railway', 'transport']):
        return 'Transport'
    elif any(x in merchant for x in ['jio', 'airtel', 'electricity', 'water', 'gas', 'recharge']):
        return 'Utilities'
    elif any(x in merchant for x in ['rent', 'maintenance', 'housing', 'broker']):
        return 'Housing'
    elif any(x in merchant for x in ['gym', 'pharmacy', 'hospital', 'doctor', 'med']):
        return 'Health & Fitness'
    return 'Miscellaneous'

def predict(merchant_name: str) -> str:
    if _model is None:
        return basic_categorize(merchant_name)
        
    try:
        probs = _model.predict_proba([merchant_name])[0]
        max_prob = max(probs)
        if max_prob < 0.4:
            return 'Miscellaneous'
        return _model.classes_[probs.argmax()]
    except Exception as e:
        logger.error(f"Prediction error for {merchant_name}: {e}")
        return basic_categorize(merchant_name)

def predict_batch(merchants: list[str]) -> list[str]:
    if _model is None:
        return [basic_categorize(m) for m in merchants]
        
    try:
        probs = _model.predict_proba(merchants)
        results = []
        for prob in probs:
            if max(prob) < 0.4:
                results.append('Miscellaneous')
            else:
                results.append(_model.classes_[prob.argmax()])
        return results
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        return [basic_categorize(m) for m in merchants]
