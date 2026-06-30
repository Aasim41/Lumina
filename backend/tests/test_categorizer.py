from app.services.categorizer import predict, predict_batch, load_model

def test_categorizer_basic():
    # If ML model not loaded, basic categorization should still work
    assert predict("Zomato") == "Food & Dining"
    assert predict("Netflix") == "Entertainment"
    assert predict("Uber Ride") == "Transport"
    assert predict("Random Unknown Merchant") == "Miscellaneous"

def test_categorizer_batch():
    merchants = ["Swiggy", "Amazon", "Airtel"]
    categories = predict_batch(merchants)
    assert len(categories) == 3
    assert "Food & Dining" in categories[0]
    assert "Shopping" in categories[1]
    assert "Utilities" in categories[2]
