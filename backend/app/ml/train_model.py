import os
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib

def train_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, 'training_data.csv')
    model_path = os.path.join(current_dir, 'model.pkl')
    
    print(f"Loading training data from {data_path}...")
    df = pd.read_csv(data_path)
    
    # Basic augmentation to make it more robust
    augmented_data = []
    for _, row in df.iterrows():
        merchant = row['merchant']
        category = row['category']
        
        # Original
        augmented_data.append({'merchant': merchant, 'category': category})
        # Lowercase
        augmented_data.append({'merchant': merchant.lower(), 'category': category})
        # Uppercase
        augmented_data.append({'merchant': merchant.upper(), 'category': category})
        # With common suffixes
        augmented_data.append({'merchant': f"{merchant} Pvt Ltd", 'category': category})
        augmented_data.append({'merchant': f"{merchant} India", 'category': category})
        
    aug_df = pd.DataFrame(augmented_data)
    
    X = aug_df['merchant']
    y = aug_df['category']
    
    print("Training TF-IDF + Logistic Regression model...")
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(analyzer='char_wb', ngram_range=(2, 4))),
        ('clf', LogisticRegression(multi_class='multinomial', max_iter=1000, C=1.0))
    ])
    
    pipeline.fit(X, y)
    
    print("\nClassification Report on Training Data:")
    y_pred = pipeline.predict(X)
    print(classification_report(y, y_pred))
    
    print(f"Saving model to {model_path}...")
    joblib.dump(pipeline, model_path)
    print("Done!")

if __name__ == '__main__':
    train_model()
