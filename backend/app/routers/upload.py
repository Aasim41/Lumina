from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Transaction
from app.schemas import UploadResponse, TransactionResponse
from app.services.cleaner import clean_dataframe
from app.services.categorizer import predict_batch
import pandas as pd
import io

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported for bulk upload")
        
    contents = await file.read()
    
    # Intelligently find the header row by searching for 'date' and 'amount'/'debit'
    import io
    import pandas as pd
    
    text = contents.decode('utf-8', errors='replace')
    lines = text.splitlines()
    
    header_idx = 0
    for i, line in enumerate(lines[:50]):
        row_lower = line.lower()
        if 'date' in row_lower and any(x in row_lower for x in ['amount', 'debit', 'withdrawal', 'rs', 'value', 'credit']):
            header_idx = i
            break
            
    try:
        df = pd.read_csv(io.StringIO(text), skiprows=header_idx)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {e}")
        
    # Clean data
    try:
        clean_df = clean_dataframe(df)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error cleaning data: {e}")
        
    if clean_df.empty:
        raise HTTPException(status_code=400, detail="No valid transactions found in the CSV")
        
    # Categorize
    merchants = clean_df['merchant_clean'].tolist()
    categories = predict_batch(merchants)
    clean_df['category'] = categories
    
    # Insert to DB
    transactions_to_insert = []
    for _, row in clean_df.iterrows():
        txn = Transaction(
            user_id=current_user.id,
            date=row['date'].date() if pd.notnull(row['date']) else None,
            merchant_raw=row['merchant_raw'],
            merchant_clean=row['merchant_clean'],
            amount=row['amount'],
            category=row['category'],
            source='csv_upload'
        )
        # Assuming cleaner handles nulls correctly, if date is None skip or raise? 
        # Cleaner should drop null dates or amounts.
        if txn.date and pd.notnull(txn.amount):
            transactions_to_insert.append(txn)
            
    if not transactions_to_insert:
        raise HTTPException(status_code=400, detail="No valid transactions to insert after cleaning")
        
    db.add_all(transactions_to_insert)
    await db.commit()
    
    for txn in transactions_to_insert:
        await db.refresh(txn)
        
    return UploadResponse(
        rows_processed=len(transactions_to_insert),
        categories_found=len(set(categories)),
        skipped_rows=len(df) - len(transactions_to_insert),
        transactions=[TransactionResponse.model_validate(t) for t in transactions_to_insert]
    )

@router.post("/upload/receipt")
async def upload_receipt(file: UploadFile = File(...)):
    import asyncio
    import re
    import pandas as pd
    
    merchant = "Scanned Receipt"
    amount = 0.0
    date = pd.Timestamp.now().strftime('%Y-%m-%d')
    category = "Miscellaneous"
    
    if file.filename.lower().endswith('.pdf'):
        try:
            import PyPDF2
            import io
            contents = await file.read()
            pdf = PyPDF2.PdfReader(io.BytesIO(contents))
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
            
            # Find all numbers that have exactly two decimal places (standard for currency)
            amounts = re.findall(r'\b\d+\.\d{2}\b', text)
            if amounts:
                # Filter out unreasonably large numbers (> 1,000,000)
                valid_amounts = [float(a) for a in amounts if float(a) < 1000000]
                if valid_amounts:
                    amount = max(valid_amounts)
                    
            # Better merchant extraction (take first line or specific keywords if possible)
            # Zudio - Allahabad -> Zudio
            first_lines = [line.strip() for line in text.splitlines() if line.strip() and len(line.strip()) > 2]
            if first_lines:
                # Simplistic heuristic: use the first meaningful line or filename
                import os
                merchant = os.path.splitext(file.filename)[0]
                if "zudio" in text.lower():
                    merchant = "Zudio"
                elif "starbucks" in text.lower():
                    merchant = "Starbucks"
                # If we couldn't find a famous brand, just use the filename
                
            # Try to find a date
            dates = re.findall(r'(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})', text)
            if dates:
                date = dates[0]
                if '/' in date:
                    date = pd.to_datetime(date, dayfirst=True).strftime('%Y-%m-%d')
                    
            merchant = file.filename.replace('.pdf', '')
        except Exception as e:
            print(f"PDF Parsing error: {e}")
            pass
            
    await asyncio.sleep(0.5)
    
    return {
        "merchant": merchant,
        "amount": amount,
        "date": date,
        "category": category
    }
